import { useLanguage } from "@/lib/i18n";
import { SITE_DEFAULTS } from "@/lib/site-defaults";
import { useGetSiteInfo, useSubmitContactInquiry } from "@workspace/api-client-react";
import { MapPin, Phone, Mail, Clock, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

const formSchema = z.object({
  fullName: z.string().min(2, "Name is required"),
  email: z.string().email("Valid email is required"),
  phone: z.string().min(10, "Valid phone is required"),
  subject: z.string().min(5, "Subject is required"),
  message: z.string().min(10, "Message must be at least 10 characters"),
});

type FormValues = z.infer<typeof formSchema>;

export default function Contact() {
  const { language, t, isRtl } = useLanguage();
  const { data: _siteInfo } = useGetSiteInfo();
  const siteInfo = { ...SITE_DEFAULTS, ..._siteInfo };
  const createInquiry = useSubmitContactInquiry();

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
  });

  const onSubmit = async (data: FormValues) => {
    try {
      await createInquiry.mutateAsync({
        data: {
          ...data,
          language: language === "ar" ? "ar" : "en"
        }
      });
      toast.success(language === "ar" ? "تم إرسال رسالتك بنجاح. سنتواصل معك قريباً." : "Your message has been sent successfully. We will contact you soon.");
      reset();
    } catch (err) {
      toast.error(language === "ar" ? "حدث خطأ أثناء إرسال الرسالة." : "An error occurred while sending your message.");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-primary py-16 text-primary-foreground mb-12">
        <div className="container mx-auto px-4">
          <h1 className="text-4xl md:text-5xl font-serif font-bold mb-4">{t("nav.contact")}</h1>
          <p className="text-lg opacity-90 max-w-2xl">
            {language === "ar" 
              ? "نحن هنا للإجابة على استفساراتك القانونية ومساعدتك في حل نزاعاتك." 
              : "We are here to answer your legal inquiries and help you resolve your disputes."}
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24">
          
          {/* Contact Info */}
          <div>
            <h2 className="text-3xl font-serif font-bold mb-8 text-foreground">
              {language === "ar" ? "تواصل معنا" : "Get in Touch"}
            </h2>
            
            <div className="space-y-8">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-accent/10 text-accent rounded-full flex items-center justify-center shrink-0">
                  <MapPin className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-lg mb-1">{language === "ar" ? "العنوان" : "Address"}</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {language === "ar" ? siteInfo.addressAr : siteInfo.addressEn}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-accent/10 text-accent rounded-full flex items-center justify-center shrink-0">
                  <Phone className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-lg mb-1">{language === "ar" ? "الهاتف" : "Phone"}</h3>
                  <a href={`tel:${siteInfo.phone}`} className="text-muted-foreground hover:text-accent font-medium block" dir="ltr">
                    {siteInfo.phone}
                  </a>
                  {(_siteInfo as any)?.whatsapp && (
                    <a href={`https://wa.me/${(_siteInfo as any).whatsapp.replace(/[^0-9]/g, '')}`} target="_blank" rel="noreferrer" className="text-green-600 hover:text-green-700 font-medium block mt-1" dir="ltr">
                      WhatsApp: {(_siteInfo as any).whatsapp}
                    </a>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-accent/10 text-accent rounded-full flex items-center justify-center shrink-0">
                  <Mail className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-lg mb-1">{language === "ar" ? "البريد الإلكتروني" : "Email"}</h3>
                  <a href={`mailto:${siteInfo.email}`} className="text-muted-foreground hover:text-accent font-medium">
                    {siteInfo.email}
                  </a>
                </div>
              </div>

              {siteInfo?.workHours && siteInfo.workHours.length > 0 && (
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-accent/10 text-accent rounded-full flex items-center justify-center shrink-0">
                    <Clock className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg mb-1">{language === "ar" ? "ساعات العمل" : "Working Hours"}</h3>
                    <div className="text-muted-foreground space-y-1">
                      <p>{language === "ar" ? "الأحد - الخميس: 9:00 صباحاً - 5:00 مساءً" : "Sunday - Thursday: 9:00 AM - 5:00 PM"}</p>
                      <p className="text-sm">{language === "ar" ? "الجمعة والسبت: عطلة" : "Friday & Saturday: Closed"}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Google Maps Embed — الكوثر الجديد، منطقة البنوك، أمام HSBC، الغردقة */}
            <div className="mt-12 w-full rounded-2xl border border-border overflow-hidden shadow-sm" style={{ height: "340px" }}>
              <iframe
                title={language === "ar" ? "موقع المكتب على الخريطة" : "Office Location Map"}
                width="100%"
                height="100%"
                style={{ border: 0, display: "block" }}
                loading="lazy"
                allowFullScreen
                referrerPolicy="no-referrer-when-downgrade"
                src="https://maps.google.com/maps?q=HSBC+Banking+District+Al+Kawthar+Hurghada+Egypt&hl=ar&z=16&output=embed"
              />
            </div>

            {/* Open in maps button */}
            <a
              href="https://www.google.com/maps/search/HSBC+Banking+District+Al+Kawthar+Hurghada+Egypt"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors font-medium"
            >
              <MapPin className="w-4 h-4" />
              {language === "ar"
                ? "الكوثر الجديد - منطقة البنوك - امام HSBC - أعلي بست واي - الدور الرابع - مكتب ٢١ - الغردقة"
                : "Al Kawthar Al Jadid District / Banking Area / In front of HSBC / Above Best Way / 4th Floor / Office No. 21 - Hurghada"
              }
            </a>
          </div>

          {/* Contact Form */}
          <div className="bg-card p-8 rounded-2xl shadow-sm border border-border">
            <h3 className="font-serif font-bold text-2xl mb-6">
              {language === "ar" ? "أرسل لنا رسالة" : "Send us a message"}
            </h3>
            
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="fullName">{language === "ar" ? "الاسم الكامل" : "Full Name"}</Label>
                  <Input id="fullName" {...register("fullName")} className="bg-background" />
                  {errors.fullName && <p className="text-destructive text-xs">{errors.fullName.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">{language === "ar" ? "رقم الهاتف" : "Phone Number"}</Label>
                  <Input id="phone" dir="ltr" className={`bg-background ${isRtl ? 'text-right' : ''}`} {...register("phone")} />
                  {errors.phone && <p className="text-destructive text-xs">{errors.phone.message}</p>}
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">{language === "ar" ? "البريد الإلكتروني" : "Email Address"}</Label>
                <Input id="email" type="email" dir="ltr" className={`bg-background ${isRtl ? 'text-right' : ''}`} {...register("email")} />
                {errors.email && <p className="text-destructive text-xs">{errors.email.message}</p>}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="subject">{language === "ar" ? "الموضوع" : "Subject"}</Label>
                <Input id="subject" {...register("subject")} className="bg-background" />
                {errors.subject && <p className="text-destructive text-xs">{errors.subject.message}</p>}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="message">{language === "ar" ? "نص الرسالة" : "Message"}</Label>
                <Textarea id="message" rows={5} {...register("message")} className="bg-background resize-none" />
                {errors.message && <p className="text-destructive text-xs">{errors.message.message}</p>}
              </div>

              <Button type="submit" className="w-full bg-accent hover:bg-accent/90 text-accent-foreground h-12 text-lg" disabled={createInquiry.isPending}>
                {createInquiry.isPending ? (
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                ) : (
                  <Send className={`w-5 h-5 ${isRtl ? 'ml-2' : 'mr-2'}`} />
                )}
                {language === "ar" ? "إرسال الرسالة" : "Send Message"}
              </Button>
            </form>
          </div>
          
        </div>
      </div>
    </div>
  );
}
