# دليل الأعمال — نظام تسجيل حضور الفعاليات القضائية

**Court Event Attendance — Business Guide**

نظام تسجيل حضور القضاة والنيابة لفعاليات محكمة النقض (اليوبيل الذهبي وغيره من الفعاليات).

**الموقع الرسمي:** [https://court-events.flagshipfintech.com](https://court-events.flagshipfintech.com)

---

## 1. نظرة عامة

| الخطوة | من يقوم بها | ماذا يحدث |
|--------|-------------|-----------|
| 1 | القاضي / النيابة | يملأ نموذج التسجيل عبر رابط الفعالية |
| 2 | الإدارة | تراجع الطلبات وتوافق أو ترفض |
| 3 | النظام | يرسل رمز QR بالبريد و/أو WhatsApp عند الموافقة |
| 4 | طاقم الاستقبال | يمسح QR عند الوصول عبر تطبيق الجوال |
| 5 | النظام | يسجل الحضور ويُبطل الرمز (استخدام مرة واحدة) |

---

## 2. الروابط الرئيسية (Production)

### للجمهور — القضاة والنيابة

| الوصف | الرابط |
|--------|--------|
| الصفحة الرئيسية | [https://court-events.flagshipfintech.com](https://court-events.flagshipfintech.com) |
| تسجيل حضور — فعالية اليوبيل الذهبي (تجريبي) | [https://court-events.flagshipfintech.com/register/golden-jubilee-2026](https://court-events.flagshipfintech.com/register/golden-jubilee-2026) |
| تسجيل فعالية أخرى | `https://court-events.flagshipfintech.com/register/{اسم-الفعالية}` |

> رابط كل فعالية جديدة يُنشأ من لوحة الإدارة → **الفعاليات** بعد إنشاء الفعالية.

---

### للإدارة — لوحة التحكم

| الوصف | الرابط |
|--------|--------|
| **دخول الإدارة** | [https://court-events.flagshipfintech.com/admin/login](https://court-events.flagshipfintech.com/admin/login) |
| **لوحة التسجيلات** (الصفحة الرئيسية بعد الدخول) | [https://court-events.flagshipfintech.com/admin](https://court-events.flagshipfintech.com/admin/) |
| إدارة الفعاليات | [https://court-events.flagshipfintech.com/admin/events](https://court-events.flagshipfintech.com/admin/events) |
| إدارة المستخدمين | [https://court-events.flagshipfintech.com/admin/users](https://court-events.flagshipfintech.com/admin/users) |
| إعدادات الإشعارات (بريد / WhatsApp) | [https://court-events.flagshipfintech.com/admin/settings](https://court-events.flagshipfintech.com/admin/settings) |

---

## 3. بيانات الدخول (حسابات تجريبية)

> **تنبيه أمني:** غيّروا كلمات المرور فور بدء التشغيل الفعلي. لا تشاركوا هذه البيانات خارج الفريق المخول.

### لوحة الإدارة (الويب)

| الدور | البريد الإلكتروني | كلمة المرور | الصلاحيات |
|------|-------------------|-------------|-----------|
| **مدير النظام** | `admin@court.local` | `Admin@123` | إنشاء فعاليات، مستخدمين، موافقة، تصدير، إعدادات |
| **مدير الموافقات** | `manager@court.local` | `Admin@123` | مراجعة التسجيلات، موافقة/رفض، تصدير |

**رابط الدخول:** [https://court-events.flagshipfintech.com/admin/login](https://court-events.flagshipfintech.com/admin/login)

---

### تطبيق مسح QR (الجوال — طاقم الاستقبال)

| الدور | البريد الإلكتروني | كلمة المرور |
|------|-------------------|-------------|
| **طاقم الفعالية** | `staff@court.local` | `Admin@123` |

- يُثبَّت تطبيق **مسح حضور الفعاليات** (Expo / APK من فريق التقنية).
- عند فتح التطبيق: أدخل نفس البريد وكلمة المرور أعلاه.
- اختر الفعالية النشطة، ثم امسح رمز QR عند استقبال الحضور.

**عنوان الخادم في التطبيق:** `https://court-events.flagshipfintech.com`

---

## 4. دليل الاستخدام حسب الدور

### أ) مدير النظام

1. ادخل من [دخول الإدارة](https://court-events.flagshipfintech.com/admin/login) بحساب `admin@court.local`.
2. **فعاليات** → أنشئ/عدّل فعالية (الاسم، التاريخ، **شعار**) → انسخ **رابط التسجيل** وارسله للمدعوين. لمسح كل تسجيلات فعالية: **مسح البيانات** + كلمة مرور المدير.
3. **المستخدمون** → أضف حسابات مديري موافقات أو طاقم استقبال جدد.
4. **الإشعارات** → تحقق من تفعيل البريد و WhatsApp (Twilio).
5. **التسجيلات** → راقب الطلبات، صدّر Excel عند الحاجة.

### ب) مدير الموافقات

1. ادخل بحساب `manager@court.local`.
2. افتح [لوحة التسجيلات](https://court-events.flagshipfintech.com/admin/).
3. رشّح حسب الفعالية / الحالة / الرتبة / الجهة.
4. **موافقة** → يُرسل QR تلقائياً للقاضي (بريد + WhatsApp إن وُجد الإعداد).
5. **رفض** → يُغلق الطلب دون إرسال QR.

### ج) القاضي / النيابة

1. يفتح رابط التسجيل (مثال: [تسجيل اليوبيل الذهبي](https://court-events.flagshipfintech.com/register/golden-jubilee-2026)).
2. يملأ الحقول الإلزامية (الاسم، الرتبة، الجهة، البريد، الجوال).
3. بعد الإرسال: رسالة «طلبكم قيد المراجعة».
4. بعد الموافقة: يستلم QR على البريد و/أو WhatsApp.
5. عند الوصول: يُبرز QR لطاقم الاستقبال للمسح.

### د) طاقم الاستقبال

1. يفتح تطبيق المسح ويسجل دخول `staff@court.local`.
2. يختار الفعالية من القائمة.
3. يمسح QR:
   - **أخضر / نجاح** → حضور مسجل.
   - **أحمر** → رمز غير صالح، مستخدم مسبقاً، أو فعالية خاطئة.

---

## 5. حالات التسجيل

| الحالة | المعنى |
|--------|--------|
| قيد المراجعة | وصل الطلب ولم يُبت فيه بعد |
| موافق عليه | تمت الموافقة وتم إرسال QR |
| مرفوض | لم يُقبل الطلب |
| تم الحضور | تم مسح QR بنجاح في الفعالية |

---

## 6. روابط مساعدة

| المورد | الرابط |
|--------|--------|
| مستودع GitHub (تقني) | [github.com/eslamene/court-event-attendance](https://github.com/eslamene/court-event-attendance) |
| دليل تقني للروابط | [URLS.md](./URLS.md) |
| إعداد Twilio (بريد + WhatsApp) | [docs/TWILIO_INTEGRATION.md](./docs/TWILIO_INTEGRATION.md) |
| شعار الفعالية (على الموقع) | [https://court-events.flagshipfintech.com/logo.jpeg](https://court-events.flagshipfintech.com/logo.jpeg) |

---

## 7. أسئلة شائعة

**كيف أحصل على رابط تسجيل لفعالية جديدة؟**  
مدير النظام → [الفعاليات](https://court-events.flagshipfintech.com/admin/events) → إنشاء فعالية → نسخ الرابط.

**لم يصل QR للقاضي؟**  
تأكد من الموافقة على الطلب، ومن إعداد البريد/WhatsApp في [الإشعارات](https://court-events.flagshipfintech.com/admin/settings).

**هل يمكن التسجيل مرتين بنفس البريد؟**  
لا — لنفس الفعالية يُرفض التكرار (نفس البريد أو نفس الجوال).

**من يغيّر كلمات المرور؟**  
مدير النظام → [المستخدمون](https://court-events.flagshipfintech.com/admin/users) → إعادة تعيين كلمة المرور.

---

## 8. جهات الاتصال التقنية

للدعم الفني (استضافة، Twilio، تطبيق الجوال): فريق **Flagship FinTech** / قسم تقنية المنتج.

---

*آخر تحديث: يونيو 2026 — النطاق: court-events.flagshipfintech.com*
