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
import { format, addDays } from "date-fns";
import { ar, enUS } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Calendar } from "@/components/ui/calendar";
import { CheckCircle2, ChevronRight, ChevronLeft, CreditCard, Building2, Monitor, Loader2 } from "lucide-react";
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
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-bold font-serif">{language === "ar" ? service.nameAr : service.nameEn}</h3>
                <span className="font-bold text-accent">
                  {new Intl.NumberFormat(language === "ar" ? "ar-EG" : "en-EG", { style: "currency", currency: "EGP" }).format(service.priceEgp)}
                </span>
              </div>
              <p className="text-sm text-muted-foreground line-clamp-2">{language === "ar" ? service.descriptionAr : service.descriptionEn}</p>
              <div className="mt-4 flex items-center text-xs font-medium text-foreground/80 bg-background px-2 py-1 rounded inline-block">
                {service.durationMinutes} {language === "ar" ? "دقيقة" : "min"}
              </div>
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

  const renderStep2 = () => (
    <div className="space-y-6">
      <div className="mb-6">
        <h2 className="text-2xl font-serif font-bold text-foreground mb-2">
          {language === "ar" ? "اختر الموعد" : "Select Date & Time"}
        </h2>
        <p className="text-muted-foreground">
          {language === "ar" ? "الرجاء اختيار اليوم والوقت المناسب لك." : "Please select the date and time that suits you."}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <Card>
            <CardContent className="p-4 flex justify-center">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                disabled={(date) => date < new Date(new Date().setHours(0,0,0,0)) || date.getDay() === 5} // Disable past dates and Fridays
                className="rounded-md border-0"
              />
            </CardContent>
          </Card>
        </div>

        <div>
          <h3 className="font-bold mb-4">{language === "ar" ? "المواعيد المتاحة" : "Available Time Slots"}</h3>
          {isLoadingSlots ? (
            <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
          ) : availability?.slots.filter(s => s.available).length === 0 ? (
            <div className="p-6 bg-muted text-center rounded-lg border border-border text-muted-foreground">
              {language === "ar" ? "لا توجد مواعيد متاحة في هذا اليوم" : "No available slots on this date"}
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {availability?.slots.filter(s => s.available).map((slot) => (
                <div
                  key={slot.time}
                  onClick={() => setSelectedTime(slot.time)}
                  className={`py-2 px-3 text-center rounded-md border cursor-pointer font-medium text-sm transition-colors ${
                    selectedTime === slot.time
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card border-border hover:border-primary/50 text-foreground"
                  }`}
                  dir="ltr"
                >
                  {slot.time}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-between pt-6 border-t border-border mt-8">
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
              <p className="text-sm text-muted-foreground mb-1">{language === "ar" ? "التكلفة" : "Cost"}</p>
              <p className="font-bold text-lg text-accent">
                {new Intl.NumberFormat(language === "ar" ? "ar-EG" : "en-EG", { style: "currency", currency: "EGP" }).format(selectedService?.priceEgp || 0)}
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
        <Button onClick={() => {
          const form = document.getElementById("booking-form") as HTMLFormElement;
          form.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
        }} disabled={createAppointment.isPending} className="bg-accent hover:bg-accent/90 text-accent-foreground">
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
