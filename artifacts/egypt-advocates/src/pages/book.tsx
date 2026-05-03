import { useState, useMemo } from "react";
import { useLanguage } from "@/lib/i18n";
import { useLocation, Link } from "wouter";
import { 
  useListServices, 
  useGetAvailability, 
  useCreateAppointment,
  CreateAppointmentInputPaymentMethod,
  CreateAppointmentInputMode
} from "@workspace/api-client-react";
import { format } from "date-fns";
import { ar, enUS } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Calendar } from "@/components/ui/calendar";
import { CheckCircle2, ChevronRight, ChevronLeft, Building2, Monitor, Loader2, CalendarDays, Clock, Sun, Sunrise, Sunset } from "lucide-react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

const formSchema = z.object({
  clientName: z.string().min(2, "Name is required"),
  clientEmail: z.string().email("Valid email is required"),
  clientPhone: z.string().min(10, "Valid phone is required"),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export default function Book() {
  const { language, t, isRtl } = useLanguage();
  const [location, setLocation] = useLocation();
  const searchParams = new URLSearchParams(window.location.search);
  const initialServiceId = searchParams.get("serviceId") ? parseInt(searchParams.get("serviceId") as string) : null;
  
  const [step, setStep] = useState(1);
  const [selectedServiceId, setSelectedServiceId] = useState<number | null>(initialServiceId);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [mode, setMode] = useState<CreateAppointmentInputMode>("in_office");
  const [paymentMethod, setPaymentMethod] = useState<CreateAppointmentInputPaymentMethod>("bank_transfer");

  const { data: services, isLoading: isLoadingServices } = useListServices();
  
  const dateStr = selectedDate ? format(selectedDate, "yyyy-MM-dd") : "";
  const { data: availability, isLoading: isLoadingSlots } = useGetAvailability(
    { date: dateStr }, { query: { enabled: !!dateStr && step === 2, queryKey: [] as const } as any });

  const createAppointment = useCreateAppointment();

  const selectedService = useMemo(() => 
    services?.find(s => s.id === selectedServiceId), 
  [services, selectedServiceId]);

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
  });

  const onNext = () => setStep(s => Math.min(s + 1, 4));
  const onPrev = () => setStep(s => Math.max(s - 1, 1));

  const onSubmit = async (data: FormValues) => {
    if (!selectedServiceId || !selectedDate || !selectedTime) return;

    try {
      const scheduledAtStr = `${format(selectedDate, "yyyy-MM-dd")}T${selectedTime}:00`;
      
      await createAppointment.mutateAsync({
        data: {
          clientName: data.clientName,
          clientEmail: data.clientEmail,
          clientPhone: data.clientPhone,
          serviceId: selectedServiceId,
          scheduledAt: scheduledAtStr,
          mode: mode,
          paymentMethod: paymentMethod,
          language: language === "ar" ? "ar" : "en",
          notes: data.notes || undefined
        }
      });
      
      setStep(5); // Success step
    } catch (err: any) {
      toast.error(language === "ar" ? "حدث خطأ أثناء الحجز" : "Failed to book appointment");
    }
  };

  const renderStep1 = () => (
    <div className="space-y-6">
      <div className="mb-6">
        <h2 className="text-2xl font-serif font-bold text-foreground mb-2">
          {language === "ar" ? "اختر الخدمة" : "Select Service"}
        </h2>
        <p className="text-muted-foreground">
          {language === "ar" ? "الرجاء اختيار نوع الاستشارة أو الخدمة المطلوبة." : "Please select the type of consultation or service required."}
        </p>
      </div>

      {isLoadingServices ? (
        <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {services?.map((service) => (
            <div 
              key={service.id}
              className={`border-2 rounded-xl p-4 cursor-pointer transition-all ${
                selectedServiceId === service.id 
                  ? "border-accent bg-accent/5 shadow-sm" 
                  : "border-border hover:border-primary/30"
              }`}
              onClick={() => setSelectedServiceId(service.id)}
            >
              <div className="flex justify-between items-start mb-2 gap-3">
                <h3 className="font-bold font-serif">{language === "ar" ? service.nameAr : service.nameEn}</h3>
                <span className="text-[11px] font-medium text-muted-foreground bg-muted/60 px-2 py-1 rounded whitespace-nowrap">
                  {service.durationMinutes} {language === "ar" ? "د" : "min"}
                </span>
              </div>
              <p className="text-sm text-muted-foreground line-clamp-2">{language === "ar" ? service.descriptionAr : service.descriptionEn}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex justify-end pt-6 border-t border-border mt-8">
        <Button onClick={onNext} disabled={!selectedServiceId}>
          {language === "ar" ? "التالي" : "Next"} 
          {isRtl ? <ChevronLeft className="w-4 h-4 ml-1" /> : <ChevronRight className="w-4 h-4 ml-1" />}
        </Button>
      </div>
    </div>
  );

  const renderStep2 = () => {
    const dateLocale = language === "ar" ? ar : enUS;
    const availableSlots = (availability?.slots ?? []).filter((s) => s.available);
    /* Group slots into morning / afternoon / evening for clarity. */
    const groupSlot = (t: string): "morning" | "afternoon" | "evening" => {
      const h = parseInt(t.split(":")[0] ?? "0", 10);
      if (h < 12) return "morning";
      if (h < 17) return "afternoon";
      return "evening";
    };
    const slotGroups = (
      [
        { key: "morning"   as const, title: { ar: "الفترة الصباحية", en: "Morning"   }, icon: Sunrise, items: availableSlots.filter((s) => groupSlot(s.time) === "morning") },
        { key: "afternoon" as const, title: { ar: "بعد الظهر",       en: "Afternoon" }, icon: Sun,     items: availableSlots.filter((s) => groupSlot(s.time) === "afternoon") },
        { key: "evening"   as const, title: { ar: "المساء",         en: "Evening"   }, icon: Sunset,  items: availableSlots.filter((s) => groupSlot(s.time) === "evening") },
      ]
    ).filter((g) => g.items.length > 0);

    return (
      <div className="space-y-6">
        <div className="mb-2">
          <h2 className="text-2xl font-serif font-bold text-foreground mb-2">
            {language === "ar" ? "اختر الموعد" : "Select Date & Time"}
          </h2>
          <p className="text-muted-foreground text-sm">
            {language === "ar"
              ? "الرجاء اختيار اليوم والوقت المناسب لك. أيام الجمعة غير متاحة."
              : "Pick a date and a time that suits you. Fridays are unavailable."}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* ─── Calendar card ─── */}
          <div className="lg:col-span-3">
            <Card className="overflow-hidden border-border/60 shadow-sm">
              <div className="bg-linear-to-br from-primary to-primary/80 text-primary-foreground px-5 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center">
                    <CalendarDays className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-[11px] uppercase tracking-widest text-white/70 font-medium">
                      {language === "ar" ? "التاريخ" : "Date"}
                    </div>
                    <div className="font-bold text-base leading-tight">
                      {selectedDate
                        ? format(selectedDate, "EEEE, dd MMMM yyyy", { locale: dateLocale })
                        : language === "ar"
                          ? "لم يتم الاختيار"
                          : "Not selected"}
                    </div>
                  </div>
                </div>
              </div>
              <CardContent className="p-3 sm:p-5 flex justify-center bg-card">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  locale={dateLocale}
                  weekStartsOn={6}
                  showOutsideDays
                  disabled={(date) =>
                    date < new Date(new Date().setHours(0, 0, 0, 0)) ||
                    date.getDay() === 5
                  }
                  className="rounded-lg border-0 [--cell-size:2.5rem] sm:[--cell-size:2.75rem] w-full max-w-md"
                />
              </CardContent>
              <div className="px-5 py-3 border-t border-border/60 bg-muted/30 flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm bg-primary inline-block" />
                  {language === "ar" ? "اليوم المختار" : "Selected"}
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm bg-accent/30 inline-block" />
                  {language === "ar" ? "اليوم" : "Today"}
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm bg-muted border border-border inline-block opacity-50" />
                  {language === "ar" ? "غير متاح" : "Unavailable"}
                </span>
              </div>
            </Card>
          </div>

          {/* ─── Time slots ─── */}
          <div className="lg:col-span-2">
            <Card className="overflow-hidden border-border/60 shadow-sm h-full">
              <div className="bg-linear-to-br from-accent to-accent/80 text-white px-5 py-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[11px] uppercase tracking-widest text-white/70 font-medium">
                    {language === "ar" ? "الوقت" : "Time"}
                  </div>
                  <div className="font-bold text-base leading-tight" dir="ltr">
                    {selectedTime ?? (language === "ar" ? "لم يتم الاختيار" : "Not selected")}
                  </div>
                </div>
              </div>
              <CardContent className="p-5">
                {!selectedDate ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                    <CalendarDays className="w-10 h-10 mb-3 text-muted-foreground/50" />
                    <p className="text-sm">
                      {language === "ar" ? "اختر التاريخ أولاً" : "Pick a date first"}
                    </p>
                  </div>
                ) : isLoadingSlots ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-accent mb-3" />
                    <p className="text-sm text-muted-foreground">
                      {language === "ar" ? "جاري تحميل المواعيد..." : "Loading slots..."}
                    </p>
                  </div>
                ) : availableSlots.length === 0 ? (
                  <div className="text-center py-10 px-4 rounded-lg bg-muted/40 border border-dashed border-border">
                    <Clock className="w-8 h-8 mx-auto mb-2 text-muted-foreground/60" />
                    <p className="text-sm font-medium text-foreground mb-1">
                      {language === "ar" ? "لا توجد مواعيد متاحة" : "No slots available"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {language === "ar" ? "حاول اختيار يوم آخر" : "Please try a different day"}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-5">
                    {slotGroups.map((group) => {
                      const Icon = group.icon;
                      return (
                        <div key={group.key}>
                          <div className="flex items-center gap-2 mb-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            <Icon className="w-3.5 h-3.5" />
                            {group.title[language === "ar" ? "ar" : "en"]}
                            <span className="text-[10px] font-normal opacity-60 ms-1">
                              ({group.items.length})
                            </span>
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            {group.items.map((slot) => (
                              <button
                                key={slot.time}
                                type="button"
                                onClick={() => setSelectedTime(slot.time)}
                                className={`py-2.5 px-2 text-center rounded-lg border text-sm font-semibold transition-all ${
                                  selectedTime === slot.time
                                    ? "bg-accent text-white border-accent shadow-sm scale-[1.02]"
                                    : "bg-card border-border/70 hover:border-accent/50 hover:bg-accent/5 text-foreground"
                                }`}
                                dir="ltr"
                              >
                                {slot.time}
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* ─── Selection summary ─── */}
        {selectedDate && selectedTime && (
          <div className="rounded-xl border border-accent/30 bg-accent/5 p-4 flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-accent shrink-0" />
            <div className="text-sm">
              <span className="font-medium text-foreground">
                {language === "ar" ? "تم اختيار: " : "Selected: "}
              </span>
              <span className="text-muted-foreground">
                {format(selectedDate, "EEEE, dd MMMM yyyy", { locale: dateLocale })}
              </span>
              <span className="font-bold text-accent ms-2" dir="ltr">
                @ {selectedTime}
              </span>
            </div>
          </div>
        )}

        <div className="flex justify-between pt-6 border-t border-border mt-2">
          <Button variant="outline" onClick={onPrev}>
            {language === "ar" ? "السابق" : "Previous"}
          </Button>
          <Button onClick={onNext} disabled={!selectedDate || !selectedTime}>
            {language === "ar" ? "التالي" : "Next"}
            {isRtl ? <ChevronLeft className="w-4 h-4 ml-1" /> : <ChevronRight className="w-4 h-4 ml-1" />}
          </Button>
        </div>
      </div>
    );
  };

  const renderStep3 = () => (
    <div className="space-y-8">
      <div className="mb-6">
        <h2 className="text-2xl font-serif font-bold text-foreground mb-2">
          {language === "ar" ? "بياناتك الشخصية" : "Your Details"}
        </h2>
        <p className="text-muted-foreground">
          {language === "ar" ? "الرجاء إدخال بياناتك واختيار طريقة الدفع." : "Please enter your details and select a payment method."}
        </p>
      </div>

      <form id="booking-form" onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="clientName">{language === "ar" ? "الاسم الكامل" : "Full Name"}</Label>
            <Input id="clientName" {...register("clientName")} />
            {errors.clientName && <p className="text-destructive text-sm">{errors.clientName.message as string}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="clientPhone">{language === "ar" ? "رقم الهاتف" : "Phone Number"}</Label>
            <Input id="clientPhone" dir="ltr" className={isRtl ? "text-right" : ""} {...register("clientPhone")} />
            {errors.clientPhone && <p className="text-destructive text-sm">{errors.clientPhone.message as string}</p>}
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="clientEmail">{language === "ar" ? "البريد الإلكتروني" : "Email Address"}</Label>
            <Input id="clientEmail" type="email" dir="ltr" className={isRtl ? "text-right" : ""} {...register("clientEmail")} />
            {errors.clientEmail && <p className="text-destructive text-sm">{errors.clientEmail.message as string}</p>}
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="notes">{language === "ar" ? "ملاحظات إضافية (اختياري)" : "Additional Notes (Optional)"}</Label>
            <Textarea id="notes" rows={3} {...register("notes")} />
          </div>
        </div>

        {selectedService && selectedService.deliveryMode === 'both' && (
          <div className="space-y-4 pt-4 border-t border-border">
            <Label className="text-base font-bold">{language === "ar" ? "طريقة الاستشارة" : "Consultation Mode"}</Label>
            <RadioGroup 
              value={mode} 
              onValueChange={(val) => setMode(val as CreateAppointmentInputMode)}
              className="grid grid-cols-1 md:grid-cols-2 gap-4"
            >
              <div className="flex items-center space-x-2 border rounded-lg p-4 cursor-pointer hover:bg-muted/50 [&:has(:checked)]:border-primary">
                <RadioGroupItem value="online" id="mode-online" className={isRtl ? "ml-2" : "mr-2"} />
                <Label htmlFor="mode-online" className="flex-1 cursor-pointer flex items-center gap-2">
                  <Monitor className="w-5 h-5 text-muted-foreground" />
                  {language === "ar" ? "استشارة أونلاين" : "Online Consultation"}
                </Label>
              </div>
              <div className="flex items-center space-x-2 border rounded-lg p-4 cursor-pointer hover:bg-muted/50 [&:has(:checked)]:border-primary">
                <RadioGroupItem value="in_office" id="mode-in-office" className={isRtl ? "ml-2" : "mr-2"} />
                <Label htmlFor="mode-in-office" className="flex-1 cursor-pointer flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-muted-foreground" />
                  {language === "ar" ? "في المكتب" : "In-Office"}
                </Label>
              </div>
            </RadioGroup>
          </div>
        )}

        <div className="space-y-4 pt-4 border-t border-border">
          <Label className="text-base font-bold">{language === "ar" ? "طريقة الدفع" : "Payment Method"}</Label>
          <RadioGroup 
            value={paymentMethod} 
            onValueChange={(val) => setPaymentMethod(val as CreateAppointmentInputPaymentMethod)}
            className="grid grid-cols-2 md:grid-cols-3 gap-4"
          >
            {[
              { id: "instapay", label: "InstaPay" },
              { id: "vodafone_cash", label: "Vodafone Cash" },
              { id: "bank_transfer", label: language === "ar" ? "تحويل بنكي" : "Bank Transfer" },
              { id: "visa", label: "Credit Card (Visa/MC)" },
              { id: "cash", label: language === "ar" ? "نقداً في المكتب" : "Cash (In Office)" }
            ].map((pm) => (
              <div key={pm.id} className="flex items-center space-x-2 border rounded-lg p-4 cursor-pointer hover:bg-muted/50 [&:has(:checked)]:border-primary">
                <RadioGroupItem value={pm.id} id={`pm-${pm.id}`} className={isRtl ? "ml-2" : "mr-2"} />
                <Label htmlFor={`pm-${pm.id}`} className="flex-1 cursor-pointer font-medium">
                  {pm.label}
                </Label>
              </div>
            ))}
          </RadioGroup>

          {/* Payment Instructions Panel */}
          <div className="bg-muted p-4 rounded-lg mt-4 text-sm">
            {paymentMethod === "instapay" && (
              <p>{language === "ar" ? "الرجاء التحويل إلى عنوان إنستاباي: egyptadvocates@instapay" : "Please transfer to InstaPay address: egyptadvocates@instapay"}</p>
            )}
            {paymentMethod === "vodafone_cash" && (
              <p>{language === "ar" ? "الرجاء التحويل إلى رقم فودافون كاش: 01000000000" : "Please transfer to Vodafone Cash number: 01000000000"}</p>
            )}
            {paymentMethod === "bank_transfer" && (
              <p>{language === "ar" ? "رقم الحساب البنكي: 1234567890 - البنك الأهلي المصري - الفرع الرئيسي" : "Bank Account: 1234567890 - National Bank of Egypt - Main Branch"}</p>
            )}
            {paymentMethod === "visa" && (
              <p>{language === "ar" ? "سيتم توجيهك إلى بوابة الدفع الآمنة بعد إتمام الحجز." : "You will be redirected to the secure payment gateway after completing the booking."}</p>
            )}
            {paymentMethod === "cash" && (
              <p>{language === "ar" ? "يتم الدفع نقداً عند الحضور للمكتب." : "Payment will be collected in cash upon arrival at the office."}</p>
            )}
          </div>
        </div>

        <div className="flex justify-between pt-6 border-t border-border mt-8">
          <Button type="button" variant="outline" onClick={onPrev}>
            {language === "ar" ? "السابق" : "Previous"}
          </Button>
          <Button type="button" onClick={() => setStep(4)}>
            {language === "ar" ? "مراجعة وتأكيد" : "Review & Confirm"}
          </Button>
        </div>
      </form>
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-6">
      <div className="mb-6">
        <h2 className="text-2xl font-serif font-bold text-foreground mb-2">
          {language === "ar" ? "مراجعة وتأكيد" : "Review & Confirm"}
        </h2>
        <p className="text-muted-foreground">
          {language === "ar" ? "الرجاء مراجعة تفاصيل الحجز قبل التأكيد النهائي." : "Please review your booking details before final confirmation."}
        </p>
      </div>

      <Card className="border-accent/20 bg-accent/5">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-12">
            <div>
              <p className="text-sm text-muted-foreground mb-1">{language === "ar" ? "الخدمة" : "Service"}</p>
              <p className="font-bold text-lg">{language === "ar" ? selectedService?.nameAr : selectedService?.nameEn}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">{language === "ar" ? "المدة" : "Duration"}</p>
              <p className="font-bold text-lg">
                {selectedService?.durationMinutes ?? 0} {language === "ar" ? "دقيقة" : "min"}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">{language === "ar" ? "التاريخ والوقت" : "Date & Time"}</p>
              <p className="font-bold text-lg" dir="ltr">
                {selectedDate ? format(selectedDate, "dd MMM yyyy") : ""} - {selectedTime}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">{language === "ar" ? "طريقة الاستشارة" : "Consultation Mode"}</p>
              <p className="font-bold text-lg capitalize">{mode.replace("_", " ")}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">{language === "ar" ? "طريقة الدفع" : "Payment Method"}</p>
              <p className="font-bold text-lg capitalize">{paymentMethod.replace("_", " ")}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between pt-6 border-t border-border mt-8">
        <Button variant="outline" onClick={onPrev} disabled={createAppointment.isPending}>
          {language === "ar" ? "تعديل" : "Edit"}
        </Button>
        <Button onClick={() => handleSubmit(onSubmit, () => {
          toast.error(language === "ar" ? "يرجى إكمال البيانات في الخطوة السابقة" : "Please complete your details on the previous step");
          setStep(3);
        })()} disabled={createAppointment.isPending} className="bg-accent hover:bg-accent/90 text-accent-foreground">
          {createAppointment.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {language === "ar" ? "تأكيد الحجز" : "Confirm Booking"}
        </Button>
      </div>
    </div>
  );

  const renderSuccess = () => (
    <div className="text-center py-12 px-4">
      <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
        <CheckCircle2 className="w-10 h-10" />
      </div>
      <h2 className="text-3xl font-serif font-bold text-foreground mb-4">
        {language === "ar" ? "تم الحجز بنجاح!" : "Booking Successful!"}
      </h2>
      <p className="text-lg text-muted-foreground max-w-md mx-auto mb-8 leading-relaxed">
        {language === "ar" 
          ? "لقد استلمنا طلب الحجز الخاص بك. سنقوم بالتواصل معك قريباً لتأكيد الموعد عبر البريد الإلكتروني والهاتف." 
          : "We have received your booking request. We will contact you shortly to confirm your appointment via email and phone."}
      </p>
      <Button asChild size="lg">
        <Link href="/">{language === "ar" ? "العودة للرئيسية" : "Back to Home"}</Link>
      </Button>
    </div>
  );

  return (
    <div className="min-h-screen bg-muted/20 py-12 md:py-20">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden">
          
          {step < 5 && (
            <div className="bg-primary/5 border-b border-border p-6 md:p-8 flex items-center justify-center">
              <div className="flex items-center w-full max-w-2xl mx-auto">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-center flex-1 last:flex-none">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0 transition-colors ${
                      step >= i ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground border border-border"
                    }`}>
                      {i}
                    </div>
                    {i < 4 && (
                      <div className={`h-1 mx-2 flex-1 rounded-full transition-colors ${
                        step > i ? "bg-primary" : "bg-muted border border-border"
                      }`}></div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="p-6 md:p-10">
            {step === 1 && renderStep1()}
            {step === 2 && renderStep2()}
            {step === 3 && renderStep3()}
            {step === 4 && renderStep4()}
            {step === 5 && renderSuccess()}
          </div>
        </div>
      </div>
    </div>
  );
}
