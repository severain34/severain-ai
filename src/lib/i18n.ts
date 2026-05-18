// Lightweight i18n for top 10 languages. Usable before login.
export const LANGUAGES = [
  { code: "en", name: "English" },
  { code: "zh", name: "中文" },
  { code: "es", name: "Español" },
  { code: "hi", name: "हिन्दी" },
  { code: "ar", name: "العربية" },
  { code: "fr", name: "Français" },
  { code: "pt", name: "Português" },
  { code: "ru", name: "Русский" },
  { code: "ja", name: "日本語" },
  { code: "sw", name: "Kiswahili" },
];

type Dict = Record<string, string>;
export const T: Record<string, Dict> = {
  en: { signin: "Sign In", signup: "Sign Up", email: "Email", password: "Password", name: "Full Name", welcome: "Welcome to Severain AI", tagline: "The AI that can do anything.", new_chat: "New chat", message: "Message Severain AI...", expert: "Expert", learner: "Learner", fullstack: "Fullstack", search: "Search chats", upgrade: "Upgrade", logout: "Logout", language: "Language", verify_sent: "Verification email sent. Check your inbox.", quote: "“The best way to predict the future is to invent it.” — Alan Kay" },
  zh: { signin: "登录", signup: "注册", email: "邮箱", password: "密码", name: "姓名", welcome: "欢迎使用 Severain AI", tagline: "无所不能的人工智能。", new_chat: "新对话", message: "发送消息给 Severain AI...", expert: "专家", learner: "学习者", fullstack: "全栈", search: "搜索对话", upgrade: "升级", logout: "退出", language: "语言", verify_sent: "验证邮件已发送，请查收。", quote: "“预测未来的最好方法就是创造它。” — Alan Kay" },
  es: { signin: "Iniciar sesión", signup: "Registrarse", email: "Correo", password: "Contraseña", name: "Nombre", welcome: "Bienvenido a Severain AI", tagline: "La IA que puede hacer cualquier cosa.", new_chat: "Nuevo chat", message: "Mensaje para Severain AI...", expert: "Experto", learner: "Aprendiz", fullstack: "Fullstack", search: "Buscar chats", upgrade: "Mejorar", logout: "Salir", language: "Idioma", verify_sent: "Correo de verificación enviado.", quote: "“La mejor forma de predecir el futuro es inventarlo.” — Alan Kay" },
  hi: { signin: "साइन इन", signup: "साइन अप", email: "ईमेल", password: "पासवर्ड", name: "नाम", welcome: "Severain AI में आपका स्वागत है", tagline: "वह AI जो कुछ भी कर सकता है।", new_chat: "नई चैट", message: "Severain AI को संदेश...", expert: "विशेषज्ञ", learner: "शिक्षार्थी", fullstack: "फुलस्टैक", search: "चैट खोजें", upgrade: "अपग्रेड", logout: "लॉगआउट", language: "भाषा", verify_sent: "सत्यापन ईमेल भेजा गया।", quote: "“भविष्य की भविष्यवाणी का सबसे अच्छा तरीका उसे बनाना है।”" },
  ar: { signin: "تسجيل الدخول", signup: "إنشاء حساب", email: "البريد", password: "كلمة المرور", name: "الاسم", welcome: "مرحبًا بك في Severain AI", tagline: "الذكاء الذي يفعل كل شيء.", new_chat: "محادثة جديدة", message: "اكتب لـ Severain AI...", expert: "خبير", learner: "متعلم", fullstack: "فول ستاك", search: "بحث", upgrade: "ترقية", logout: "خروج", language: "اللغة", verify_sent: "تم إرسال بريد التحقق.", quote: "“أفضل طريقة للتنبؤ بالمستقبل هي اختراعه.”" },
  fr: { signin: "Connexion", signup: "Inscription", email: "E-mail", password: "Mot de passe", name: "Nom", welcome: "Bienvenue sur Severain AI", tagline: "L'IA qui peut tout faire.", new_chat: "Nouveau chat", message: "Message à Severain AI...", expert: "Expert", learner: "Apprenant", fullstack: "Fullstack", search: "Rechercher", upgrade: "Mettre à niveau", logout: "Déconnexion", language: "Langue", verify_sent: "E-mail de vérification envoyé.", quote: "« La meilleure façon de prédire l'avenir est de l'inventer. »" },
  pt: { signin: "Entrar", signup: "Cadastrar", email: "E-mail", password: "Senha", name: "Nome", welcome: "Bem-vindo ao Severain AI", tagline: "A IA que faz tudo.", new_chat: "Novo chat", message: "Mensagem para Severain AI...", expert: "Especialista", learner: "Aprendiz", fullstack: "Fullstack", search: "Buscar", upgrade: "Atualizar", logout: "Sair", language: "Idioma", verify_sent: "E-mail de verificação enviado.", quote: "“A melhor forma de prever o futuro é inventá-lo.”" },
  ru: { signin: "Войти", signup: "Регистрация", email: "Эл. почта", password: "Пароль", name: "Имя", welcome: "Добро пожаловать в Severain AI", tagline: "ИИ, который умеет всё.", new_chat: "Новый чат", message: "Сообщение Severain AI...", expert: "Эксперт", learner: "Ученик", fullstack: "Фуллстек", search: "Поиск", upgrade: "Улучшить", logout: "Выход", language: "Язык", verify_sent: "Письмо подтверждения отправлено.", quote: "«Лучший способ предсказать будущее — изобрести его.»" },
  ja: { signin: "ログイン", signup: "新規登録", email: "メール", password: "パスワード", name: "名前", welcome: "Severain AI へようこそ", tagline: "何でもできるAI。", new_chat: "新しいチャット", message: "Severain AI にメッセージ...", expert: "エキスパート", learner: "ラーナー", fullstack: "フルスタック", search: "検索", upgrade: "アップグレード", logout: "ログアウト", language: "言語", verify_sent: "確認メールを送信しました。", quote: "「未来を予測する最良の方法は、それを発明することだ。」" },
  sw: { signin: "Ingia", signup: "Jisajili", email: "Barua pepe", password: "Nenosiri", name: "Jina", welcome: "Karibu Severain AI", tagline: "AI inayoweza kufanya kila kitu.", new_chat: "Soga mpya", message: "Andika kwa Severain AI...", expert: "Mtaalam", learner: "Mwanafunzi", fullstack: "Fullstack", search: "Tafuta", upgrade: "Boresha", logout: "Toka", language: "Lugha", verify_sent: "Barua ya uthibitisho imetumwa.", quote: "“Njia bora ya kutabiri wakati ujao ni kuubuni.”" },
};

export const tr = (lang: string, key: string) => T[lang]?.[key] || T.en[key] || key;
