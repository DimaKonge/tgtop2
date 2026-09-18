# TG TOP — инструкция для Google AI по завершению проекта

## 1. Роль и цель

Ты работаешь с приватным GitHub-репозиторием `DimaKonge/tgtop2`, проектом TG TOP — Telegram Mini App для каталога и рейтинга Telegram-сообществ. Рабочая директория проекта на сервере разработки: `/home/ubuntu/gifts-lab-v2`. Не переписывай проект и не меняй архитектуру без необходимости. Сначала исправь подтверждённый blocker, затем выполни проверки. Финансовые изменения TON выполняй отдельным этапом и только после явного подтверждения владельца.

Главное правило: **не объявляй production rollout успешным, пока не прошли тесты, TypeScript, production build, required review и health checks**.

## 2. Что уже готово

Последний стабильный managed checkpoint: `b81b84c1`. Он уже содержит и проверенный dark-only интерфейс, и компактные NFT-фильтры, и выбор фона карточки, и referral bonus release.

| Область | Статус |
|---|---|
| Единая тёмная Telegram-style палитра | Готово и проверено |
| Русский/English selector, English default | Готово и проверено |
| Compact NFT filter popover | Готово и проверено |
| Inline listing controls | Готово и проверено |
| Owner card background presets | Готово в обычном listing flow; есть blocker в ranking checkout |
| Referral bonus | Готово: inviter-only, default +1 GRAM, lifetime limit 2 |
| Referral progress | Готово: `0/2`, `1/2`, `2/2` |
| Admin Bonus GRAM controls | Готово: config и manual credit по verified username с reason/audit |
| Schema migration 0065 | Сгенерирована и применена additive SQL-миграция |
| Full validation на checkpoint | 113 test files, 311 passed, 3 skipped; TypeScript и build прошли |
| GitHub PR #9 | Открыт, branch protection не разрешает merge без required review |
| VPS rollout | Не считать завершённым до merge PR и health-check deployment |

Важно: managed checkpoint уже опубликован на встроенном хостинге, но это не означает, что изменения автоматически попали в GitHub `main` или на VPS.

## 3. Первый обязательный blocker: cardBackgroundPreset в ranking checkout

Devin Review обнаружил подтверждённый defect: пользователь выбирает фон карточки в ranking checkout, но final `placeBid` mutation не получает выбранный preset. В результате после успешного размещения рейтинговой ставки фон может не сохраниться.

### 3.1 Клиентский фикс

Открой `client/src/pages/Home.tsx` и найди функцию:

```ts
const submitPlacement = (group: Group) => {
```

В объект `placeBid.mutate({...})` добавь:

```ts
cardBackgroundPreset: listingCardBackgroundPreset,
```

Рекомендуемое место — рядом с `salePriceTon`:

```ts
placeBid.mutate({
  slotId: targetSlot.id,
  groupId: group.id,
  bidAmount: value,
  currentBid: `${formatTon(value)} GRAM`,
  anonymousListing: detailVisibility === "anonymous",
  showOwnerContact,
  managerPublic,
  listingAnnouncementEnabled,
  salePriceTon: normalizedSalePrice,
  cardBackgroundPreset: listingCardBackgroundPreset,
  rewardActive: rewardCampaignEnabled,
  rewardBudget: budgetUnits,
  rewardPerSubscription: isChat ? 0 : joinRewardUnits,
  rewardPerManualAdd: isChat ? joinRewardUnits : 0,
});
```

Проверь также `openStarsPayment`. При открытии ranking checkout состояние должно инициализироваться из текущей группы, а не случайно сбрасываться:

```ts
setListingCardBackgroundPreset(
  (THEME_BACKGROUND_OPTIONS.some(item => item.value === currentGroup?.cardBackgroundPreset)
    ? currentGroup.cardBackgroundPreset
    : null) as ThemeBackground | null
);
```

Используй существующий whitelist `THEME_BACKGROUND_OPTIONS`. Не принимай произвольный CSS, URL или цвет от клиента.

### 3.2 Серверный фикс

Открой `server/routers.ts` и найди procedure `placeBid`.

В Zod input добавь поле:

```ts
cardBackgroundPreset: z.string().trim().max(64).optional(),
```

В условие, которое решает, передавать ли listing options в `payRankingBidWithGramCredit`, добавь проверку:

```ts
input.cardBackgroundPreset === undefined
```

И в объект options добавь:

```ts
cardBackgroundPreset: input.cardBackgroundPreset,
```

Итоговая логика должна быть такой:

```ts
input.anonymousListing === undefined &&
input.showOwnerContact === undefined &&
input.managerPublic === undefined &&
input.listingAnnouncementEnabled === undefined &&
input.searchIndexable === undefined &&
input.country === undefined &&
input.city === undefined &&
input.subcategory === undefined &&
input.salePriceTon === undefined &&
input.cardBackgroundPreset === undefined &&
input.rewardActive === undefined &&
input.rewardBudget === undefined &&
input.rewardPerSubscription === undefined &&
input.rewardPerManualAdd === undefined
  ? undefined
  : {
      anonymousListing: input.anonymousListing,
      showOwnerContact: input.showOwnerContact,
      managerPublic: input.managerPublic,
      listingAnnouncementEnabled: input.listingAnnouncementEnabled,
      searchIndexable: input.searchIndexable,
      country: input.country,
      city: input.city,
      subcategory: input.subcategory,
      salePriceTon: input.salePriceTon,
      cardBackgroundPreset: input.cardBackgroundPreset,
      rewardActive: input.rewardActive,
      rewardBudget: input.rewardBudget,
      rewardPerSubscription: input.rewardPerSubscription,
      rewardPerManualAdd: input.rewardPerManualAdd,
    }
```

Проверь, что `GroupListingOptions` в `server/db.ts` уже содержит:

```ts
cardBackgroundPreset?: CardBackgroundPreset | null;
```

и что `payRankingBidWithGramCredit` передаёт это поле в `groups_catalog`. Не удаляй whitelist или ownership checks.

## 4. Обязательная regression coverage

Добавь или обнови тест, который проверяет весь contract, а не только наличие строки в UI:

1. `Home.tsx` передаёт `cardBackgroundPreset` в `placeBid.mutate`.
2. `server/routers.ts` принимает поле в Zod input.
3. `placeBid` добавляет поле в options object.
4. `server/db.ts` обновляет `groups_catalog.cardBackgroundPreset` только допустимым preset.
5. `null` означает «наследовать глобальный фон приложения».
6. Повторное открытие ranking checkout загружает сохранённый preset.

Минимально добавь assertions в существующий `client/src/pages/Home.bot-links.test.ts` или создай отдельный `client/src/pages/Home.card-background-checkout.test.ts`. Если тесты используют source-contract style, они должны проверять все четыре слоя: client, router, db и rendering.

## 5. Обязательный validation pipeline

После фикса выполни из корня проекта:

```bash
pnpm test
pnpm exec tsc --noEmit
pnpm build
```

Или одной командой:

```bash
pnpm test && pnpm exec tsc --noEmit && pnpm build
```

Ожидаемый результат: все тесты проходят; TypeScript завершается без ошибок; `vite build` и все esbuild worker bundles завершаются успешно. Предупреждения о размере JS bundle или `eval` внутри внешней зависимости не считать ошибкой, если команда завершилась с кодом 0.

Дополнительно проверь mobile preview на viewport `390x844` и убедись, что главный экран не имеет горизонтального overflow, выбранный фон виден, а кнопка оплаты не перекрыта нижней навигацией.

## 6. Todo и checkpoint

Перед checkpoint проверь `todo.md`. Найденный blocker должен быть отмечен как `[x]` только после прохождения теста и build. Не удаляй старые todo items и не меняй историю.

Перед сохранением checkpoint проверь:

```bash
git status --short
git diff --stat
git diff --check
```

Сохрани checkpoint через managed project workflow с описанием, например:

> Fix ranking checkout cardBackgroundPreset propagation; add router/db regression coverage; full Vitest, TypeScript and production build passed.

## 7. GitHub PR и protected deployment

Репозиторий: `DimaKonge/tgtop2`.

Не делай `git push --force` в `main` и не обходи branch protection. Создай отдельную ветку от актуального release base, закоммить только необходимые изменения и открой PR в `main`.

Проверь:

```bash
gh pr status --repo DimaKonge/tgtop2
gh pr checks <PR_NUMBER> --repo DimaKonge/tgtop2
```

PR нельзя считать готовым к merge, пока не завершены required checks и required review. После merge в `main` дождись GitHub Actions staged pipeline. Workflow использует password-based SSH через secrets `SERVER_HOST`, `SERVER_USER`, `SERVER_PASSWORD`; он не должен требовать `SERVER_SSH_KEY`.

Не меняй firewall, DNS или SSH-доступ без необходимости. Не выводи секреты в logs, comments или chat. Не добавляй `.env`, private keys, passwords, TON mnemonic или API tokens в Git.

## 8. Referral release — что нельзя сломать

Referral implementation уже добавлена в migration 0065 и backend/frontend flow. Не удаляй и не ослабляй следующие правила:

| Правило | Требование |
|---|---|
| Кто получает бонус | Только inviter |
| Сумма по умолчанию | 100 internal units = 1 GRAM |
| Lifetime cap | 2 successful inviter rewards per inviter |
| Прогресс | `0/2`, `1/2`, `2/2` |
| Invitee reward | Ничего не получает |
| Self-referral | Запрещён |
| Duplicate invitee | Второй grant запрещён unique constraint |
| Over-limit | Событие фиксируется без денежного начисления |
| Manual admin credit | Только admin, verified Telegram username, обязательная причина и audit record |
| Balance freeze | Не внедрять в этом release |

После изменения `context.ts`, `server/db.ts`, `server/routers.ts` обязательно повторно запусти referral regression test.

## 9. TON financial hardening — отдельный этап, не смешивать с маленьким UI blocker

В приложенном аудите выделены возможные риски TON payout state machine. Это не следует исправлять вслепую в том же маленьком PR. Сначала зафиксируй card-background blocker. Затем создай отдельный финансовый design/implementation PR, только после подтверждения владельца.

### 9.1 Классификация broadcast ошибок

Проверь `server/tonPayoutWallet.ts` и `server/tonPayoutWorker.ts`. Нельзя считать любой `!response.ok` явным rejection. HTTP 500, 502, 504, 429, timeout и сетевой exception должны считаться ambiguous и уходить в reconciliation без автоматического refund.

Автоматический refund допустим только при явно доказанном rejection, например валидированный HTTP 400/422 с кодом ошибки, означающим, что BOC не принят и не мог быть принят сетью. Если upstream ответ неоднозначен, не делай повторный broadcast и не возвращай деньги автоматически.

### 9.2 Crash между `broadcast_pending` и фактическим broadcast

Проверь `processBroadcastJob`. Если worker подбирает broadcast job и видит, что withdrawal уже имеет статус `broadcast_pending`, он не должен просто закрывать job. Он должен идемпотентно гарантировать наличие reconcile job.

Требуемое поведение:

```text
broadcast job найден
→ withdrawal уже broadcast_pending
→ enqueue reconcile job if absent
→ complete current broadcast job
→ reconcile worker проверяет chain
```

Добавь unique/idempotent constraint, чтобы повторная постановка reconcile job не создавала несколько денежных processing paths.

### 9.3 `seqno` и `validUntil`

Перед добавлением новых полей сначала изучи, где именно строится BOC, какие значения реально доступны в `server/tonPayoutWallet.ts` и `server/tonPayoutNetwork.ts`, и как reconciliation получает состояние кошелька.

Не добавляй поля только ради аудита. Они должны использоваться в доказуемом recovery rule:

- если подтверждённый wallet seqno строго выше seqno заявки и сообщение протухло/не найдено, разрешён безопасный refund;
- если сообщение могло быть принято, refund запрещён до reconciliation/manual review;
- если доказательство неполное, статус должен оставаться `manual_review`, а не автоматически возвращать деньги.

Schema migration для TON выполняй additive, проверяй generated SQL и применяй через managed database migration workflow. Не используй destructive `DROP`, `TRUNCATE` или ручное изменение балансов.

### 9.4 Failure matrix

Перед финансовым PR подготовь и положи в проект failure matrix:

| Сбой | Безопасное поведение |
|---|---|
| Crash до broadcast | Reconcile job гарантированно создаётся |
| Crash во время broadcast | Ambiguous; no refund, no rebroadcast |
| HTTP 5xx/429/timeout | Ambiguous; reconciliation |
| Явный 400/422 invalid BOC | Explicit rejection; refund only if response semantics prove no acceptance |
| Duplicate worker | Lease/fencing allows only one processor |
| DB timeout после network success | Reconciliation, never instant refund |
| Reconciliation exhausted | Manual review, no automatic money movement |

Обязательно добавь regression tests для каждого перехода. Не тестируй настоящими TON средствами в development; используй deterministic mocks/fixtures без seed production balances.

## 10. Что запрещено

Не переписывай весь `Home.tsx` ради небольшого blocker. Не отключай branch protection. Не меняй production TON balances вручную. Не запускай реальные withdrawals/deposits во время тестов. Не коммить секреты. Не добавляй fake reviews, ratings или testimonials. Не объявляй VPS обновлённым, если GitHub PR ещё не смержен и service health не подтверждён.

## 11. Итоговый checklist для ответа владельцу

В финальном отчёте укажи:

1. Какие файлы изменены.
2. Какой именно payload теперь передаёт `cardBackgroundPreset`.
3. Какие тесты добавлены.
4. Результат `pnpm test`, `pnpm exec tsc --noEmit` и `pnpm build`.
5. Номер PR, commit SHA и статус required review.
6. Статус GitHub Actions deployment и health-check.
7. Подтверждение, что database balances и реальные TON операции не выполнялись.
8. Отдельный список оставшихся задач, особенно TON financial hardening, если он не был явно согласован.

Финальная формулировка должна быть честной: **«проверено локально»**, **«PR открыт»**, **«PR смержен»** и **«production health проверен»** — это разные статусы, их нельзя смешивать.

## 12. Короткая команда для старта

Скопируй Google AI следующий порядок:

```text
1. Открой проект DimaKonge/tgtop2 и проверь текущую ветку/main.
2. Не переписывай архитектуру.
3. Исправь cardBackgroundPreset в Home.tsx submitPlacement.
4. Добавь cardBackgroundPreset в Zod input и mapping placeBid в server/routers.ts.
5. Проверь db whitelist/persistence path.
6. Добавь regression test для ranking checkout.
7. Запусти pnpm test && pnpm exec tsc --noEmit && pnpm build.
8. Обнови todo.md, создай отдельную ветку и PR.
9. Дождись required review и checks.
10. Только после merge проверь staged deploy и VPS health.
11. TON financial hardening делай отдельным PR и только после отдельного подтверждения владельца.
```
