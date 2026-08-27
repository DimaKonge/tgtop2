import { Link } from "wouter";

export default function PrivacyPolicy() {
  return (
    <main className="min-h-screen bg-background px-4 py-10 text-foreground sm:px-6">
      <article className="mx-auto max-w-3xl rounded-3xl border border-border/60 bg-card/80 p-6 shadow-xl backdrop-blur sm:p-10">
        <div className="mb-8 flex items-center justify-between gap-4">
          <Link href="/" className="text-sm font-medium text-primary hover:underline">← TG TOP</Link>
          <span className="text-xs text-muted-foreground">Обновлено: 28 августа 2026</span>
        </div>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Политика конфиденциальности TG TOP</h1>
        <p className="mt-4 text-muted-foreground">Эта политика объясняет, какие данные обрабатывает TG TOP — каталог Telegram-сообществ и Telegram Mini App.</p>

        <section className="mt-8 space-y-4 text-sm leading-7 text-muted-foreground">
          <h2 className="text-xl font-semibold text-foreground">1. Какие данные мы обрабатываем</h2>
          <p>При запуске бота или Mini App TG TOP может получать Telegram user ID, username, имя профиля, язык, аватар и технические сведения, которые Telegram передаёт в подтверждённом запросе. Для каталога также обрабатываются данные подключённых Telegram-групп и каналов, которые пользователь явно добавляет через приложение.</p>

          <h2 className="pt-4 text-xl font-semibold text-foreground">2. Для чего используются данные</h2>
          <p>Данные нужны для авторизации, отображения личных групп, ведения каталога, защиты действий владельца, учёта подтверждённых запусков бота и работы поддержки. Сообщения, отправленные пользователем основному боту, могут быть доставлены владельцу TG TOP в закрытую служебную тему поддержки для ответа.</p>

          <h2 className="pt-4 text-xl font-semibold text-foreground">3. Журнал запусков и служебные сообщения</h2>
          <p>Подтверждённые первые запуски бота могут сохраняться в служебном журнале с минимальными данными аккаунта и временем события. Служебные карточки отправляются только в настроенную закрытую группу TG TOP. Мы не публикуем эти сведения в открытых каналах и не продаём пользовательские данные.</p>

          <h2 className="pt-4 text-xl font-semibold text-foreground">4. Хранение и безопасность</h2>
          <p>Данные хранятся столько, сколько необходимо для работы функций, безопасности и выполнения законных требований. Мы применяем серверную проверку Telegram identity, owner-only доступ к служебным журналам и ограничение прав ботов. Никому не передавайте коды входа, seed-фразы, пароли или ключи кошелька через TG TOP.</p>

          <h2 className="pt-4 text-xl font-semibold text-foreground">5. Сторонние сервисы</h2>
          <p>Для работы используются Telegram и инфраструктурные сервисы размещения и хранения. Их обработка данных регулируется соответствующими условиями и политиками этих сервисов.</p>

          <h2 className="pt-4 text-xl font-semibold text-foreground">6. Запросы и удаление</h2>
          <p>По вопросам доступа, исправления или удаления данных напишите владельцу TG TOP через поддержку основного бота <strong className="text-foreground">@TG_TOPBOT</strong>. В запросе не указывайте коды входа, пароли, seed-фразы или другие секреты.</p>

          <h2 className="pt-4 text-xl font-semibold text-foreground">7. Изменения политики</h2>
          <p>Мы можем обновлять эту страницу при изменении функций TG TOP. Актуальная версия всегда доступна по адресу <a className="text-primary hover:underline" href="https://tgtop.me/privacy">tgtop.me/privacy</a>.</p>
        </section>
      </article>
    </main>
  );
}
