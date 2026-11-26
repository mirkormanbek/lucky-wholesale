# Передача разработки opt.luckysport.kz

Снимок состояния: **26 ноября 2026, 19:36 (Asia/Almaty, UTC+5)**. Подготовлен по доступной истории общения с владельцем, GitHub и локальной конфигурации автоматизации Codex. Это контекст решений и незавершённой работы, а не новая спецификация. При расхождении с более поздними указаниями владельца уточнить актуальное решение.

Документ намеренно не содержит секретов, персональных идентификаторов чатов, закупочных данных или расчётов доходности. Не переносить сюда локальные proof-файлы, закрытые конфигурации и исходные выгрузки. Технические инструкции остаются в [LEADS-AND-SEO](LEADS-AND-SEO.md), [PHOTO-STUDIO](PHOTO-STUDIO.md), [HEADGUARD-INTEGRITY](HEADGUARD-INTEGRITY.md), [STUDIO-GENERATOR-COMPARISON](STUDIO-GENERATOR-COMPARISON.md), [WAREHOUSE](WAREHOUSE.md).

## 1. Договорённости из общения и причины

- Владелец хочет рабочий результат на существующем сайте. Просит сначала изучить проект и кратко объяснить план, затем менять код. При неисправности просит исправлять причину, а не убирать нужную функцию или накладывать очередное узкое правило.
- Не заставлять владельца несколько раз выяснять следующий шаг. После результата сразу сообщать: что проверено, что ещё не сделано, точное следующее действие и кто его выполняет. «PR создан», «GitHub Pages опубликован», «файлы загружены на Plesk», «проверено на opt.luckysport.kz» — разные состояния.
- Заявки должны работать для оптовых клиентов Казахстана и России. Владелец уже имеет другого бота на отдельном VPS, поэтому спрашивал, нужен ли перенос. Для данной формы выбран существующий PHP-хостинг: запрос к Telegram выполняется при отправке, постоянный процесс и дополнительный VPS не нужны. Настройки и реквизиты того другого бота неизвестны; не менять его.
- Изначально владелец потребовал хранить реквизиты Telegram исключительно в окружении. После серии проверок интерфейса Plesk выяснилось, что доступных полей окружения/дополнительных директив у него нет. **26 ноября владелец явно разрешил закрытый файл вне document root и Git**, чтобы обойтись без поддержки и переноса. Это осознанное исключение из прежнего требования, а не случайное нарушение. Окружение сохраняет приоритет. Инструкцию, имя файла и проверки см. в LEADS-AND-SEO; реальные значения существуют только на стороне владельца/хостинга.
- Публичный репозиторий нельзя использовать для закрытой бизнес-информации. Предпочтение закрытому серверному файлу не означает, что файл можно добавить в Git, положить рядом с публичным index или показывать его содержимое в чате/логах.

### Фотостудия: смысл требований, который легко потерять

Сами правила и промпты уже описаны в документации; ниже — причины и границы из чата:

- **Исходник определяет товар; ИИ меняет представление товара.** Владелец многократно отвергал результаты, где ради «правильной посадки» менялась конструкция. Нельзя превращать один тип шлема в другой, добавлять отсутствующие решётки, бамперы, застёжки, одежду или элементы комплекта.
- Референсы из общения показывали посадку, кадрирование и спортивную эмоцию. Они не разрешают заимствовать чужую конструкцию или бренд. Просьба «без надписей» касалась добавленной рекламной графики; она не была разрешением автоматически стирать существующую маркировку товара.
- Нужен универсальный подход от конкретного исходника для открытых/закрытых шлемов и других конструкций, а не «один силуэт на всю категорию» и не узкие исправления под последний пример.
- Не делать дополнительную фотографию или загрузку референса менеджером обязательным условием каждого товара: владелец прямо сказал, что не может постоянно запрашивать у менеджера ещё фото. При недостатке данных не выдумывать скрытые детали и не выдавать результат за проверенный.
- Владелец просил один раз разобраться с физикой посадки разных видов, затем применять понятную общую инструкцию. Это не задание искать/передавать интернет-референс при каждой генерации и не обоснование бесконечной платной цепочки анализ → изображение → повторные проверки.
- Спортивная агрессия означает выражение лица и подачу; она не оправдывает неверный размер/посадку и изменение изделия. Новый результат должен быть действительно пересобран от исходника, если владелец просит «сделать заново», а не маскировать прежнюю ошибку.
- Одобрение картинки, созданной встроенным инструментом в чате, не доказывает качество производственного API. Последовательные визуальные неудачи уже стоили владельцу времени: проверять исходник и результат рядом, не обещать гарантированную физическую точность.
- Были разрешены отдельные ограниченные платные проверки, в том числе один контрольный прогон с явно оговорённым лимитом. Это **не бессрочное разрешение** расходовать бюджет, повторять неудачные вызовы или менять генератор всем категориям. Для нового платного действия сверять действующее согласие и конкретный интерфейс.

## 2. Что не трогать без отдельного задания

- Не публиковать и не заменять товарные фото автоматически; сохранять исходники, принятые владельцем изображения и отдельные кандидаты. Не удалять товары ради тестов.
- Не переносить узкую правку шлемов на прочие категории; сохранять работу каталога, кабинета, цен и обычной фотостудии при эксперименте с генератором. Детали разграничения уже есть в документах фотостудии.
- Не менять PHP-версию/обработчик, инфраструктуру, домены или хостинг «заодно». На обсуждаемой странице владелец оставил PHP 7.4.33 / FastCGI; обновление требует отдельной проверки совместимости.
- Не включать старые мониторы, не запускать WB sync, платную обработку, публикацию или массовые изменения как часть проверки статуса.
- Не сливать старый черновик PR #29 целиком: часть блока о компании позже публиковалась отдельно, а ветка сохранялась под незавершённую работу с медиа. Сначала сравнить с main.
- Не добавлять неподтверждённые заявления о собственной фабрике, сертификации или проверках производства и не публиковать контактный телефон партнёра. Детали согласованных публичных материалов см. ABOUT-PRODUCTION-PREVIEW, не восстанавливать их из предположений.
- Не собирать новый стек/пакетный менеджер и не переносить сайт в другой конструктор только ради подключения заявки. Существующий PHP-путь уже проверен.

## 3. Проверенное состояние и оставшаяся работа

### Заявки и выпуск

- PR [#79](https://github.com/mirkormanbek/lucky-wholesale/pull/79) объединён 26 ноября. Владелец создал закрытый конфиг на Plesk.
- Реальный локальный тест Telegram прошёл, затем **одна помеченная тестовая заявка с production** 26 ноября около 17:20 по времени Алматы получила HTTP 200 / подтверждение Telegram примерно за 0,4 секунды. Это принятие сообщения Telegram, не подтверждение прочтения менеджером. Реальные реквизиты при этом не читались и не выводились ассистентом.
- Проверены опубликованные HTML каталога, карточка товара, форма с заполненным товаром и ширина 360 px. При передаче новый платный вызов или новая заявка не выполнялись.
- Ранее в чате оставалась оговорка о фоновой синхронизации media. При подготовке handoff run [45818459636](https://github.com/mirkormanbek/lucky-wholesale/actions/runs/45818459636) уже имеет **success**, как и соответствующие preview/Pages runs. Старую оговорку «деплой ещё идёт» не считать текущим статусом.
- **Метрика отложена:** действующий ID владельцем не предоставлен, последняя production-проверка показывала отключённый счётчик. Подключение и реальную цель проверить после получения ID; mock не считать реальным попаданием цели.
- Незавершённая задача безопасности — FTPS PR #81 (ниже). После его проверки и выпуска организовать смену ранее использовавшегося FTP-пароля и обновление соответствующего GitHub secret владельцем; значения и историю секретов в handoff не добавлять.

### Фотостудия и прочее

- [#78](https://github.com/mirkormanbek/lucky-wholesale/pull/78) включает контролируемый тест другого генератора. В доступном общении нет подтверждения выполнения живого визуального trial. Статус: **возможность опубликована, качество альтернативного генератора ещё не доказано**. Не запускать trial самостоятельно по факту передачи проекта.
- Старые этапы проверки шлемов останавливались на авторизации, запрете повторного запуска и неопределённости конструкции; затем подход был упрощён. Это не повод возвращать весь прежний каскад проверок. Закрытый без слияния #74 — исторический эксперимент.
- PR #29 остаётся источником незавершённого черновика/медиа, а не очередью на безусловный деплой.
- По текущей истории нельзя честно утверждать, что все варианты экипировки дают стабильно корректную посадку. Требование универсальности остаётся критерием качества, а не уже доказанной гарантией.

## 4. Хостинг: наблюдения и ограничения

- Production — существующий сайт на Plesk, не GitHub Pages. На скриншотах PHP 7.4.33 и FastCGI, nginx проксирует к Apache. VPS для формы не понадобился.
- Доступная владельцу панель не показывала полей окружения и дополнительных директив Apache. Это наблюдение об этой учётной записи, а не утверждение, что Plesk вообще не умеет окружение.
- Публичный корень на хостинге — папка домена. В файловом менеджере видны и файлы репозитория, и public: не угадывать document root по локальной структуре. Закрытая папка должна оставаться соседней папкой, без публичного alias.
- У main есть автоматические сценарии выкладки. **Не сливать PR только ради ревью:** слияние может выпустить сайт. Убедиться, что текущие workflow и доступ к хостингу соответствуют задаче.
- Исторически зеркалирование больших media задерживало/обрывало общий деплой. Поэтому серверные правила фотостудии и заявок загружаются и сверяются раньше media. Даже успешная ранняя загрузка не равна завершению всего run; проверять конкретные шаги и production.
- На момент снимка main всё ещё содержит незашифрованную FTP-конфигурацию с отключённой проверкой сертификата. PR #81 исправляет это, но пока не объединён. Не утверждать, что FTPS уже используется.
- Сырые данные WB не всегда присутствуют в чистом checkout. Не подменять их пустыми ради «зелёной сборки» и не путать подготовку витрины с импортом WB. Команды/предпосылки — в существующей документации.

## 5. Автоматизация «Деплой Lucky» каждые 5 минут

Проверена локальная запись Codex `lucky`, имя **«Деплой Lucky: цифры и стрелки»**, вид heartbeat. **Состояние PAUSED**, интервал 5 минут. Это локальная автоматизация Codex в прежнем чате, не cron хостинга и не обязательный GitHub Actions workflow.

Её задача: проверять run **Sync and build wholesale catalog** для одного исторического commit `0d724f9b3498894c8d13f6892f31baf03a650cfb` (цифры страниц и сохранённые стрелки); ждать шага FTP-выкладки на Plesk; затем проверить публичные index/app на реализацию пагинации и уведомить владельца. В ней явно запрещены защищённый кабинет, обход доступа, WB sync, платная обработка, удаление товаров и изменение инфраструктуры; при неизменном статусе — молчать; после итогового уведомления — отключиться.

**Нужна ли она:** для работы сайта — нет. Это одноразовый монитор старого выпуска, а не механизм деплоя. Оставить приостановленной, не переносить в нового ассистента как задачу «каждые 5 минут выкладывать main». Для нового выпуска при необходимости создать отдельный ограниченный монитор актуального SHA с явным согласием владельца. Текущий handoff не менял и не удалял автоматизацию. По конфигурации нельзя установить, кто именно её приостановил; не приписывать действие владельцу или другому ассистенту без журнала событий.

## 6. Открытые PR и приоритеты передачи

Состояние получено из GitHub 26 ноября; номера — ссылки на фактические PR, а не обещание их объединить.

| PR | Ветка | Статус и следующий шаг |
| --- | --- | --- |
| [#29](https://github.com/mirkormanbek/lucky-wholesale/pull/29) | `preview/about-production-stores` | Открыт, draft. Сверить с уже опубликованным блоком; не сливать целиком. |
| [#81](https://github.com/mirkormanbek/lucky-wholesale/pull/81) | `claude/ftps-deploy` | Открыт, не draft. Приоритетная проверка безопасности FTPS; не выпускать лишь по названию PR. По описанию #80 зашифрованное соединение отдельно проверялось, реальную выкладку после merge надо подтвердить. |
| [#82](https://github.com/mirkormanbek/lucky-wholesale/pull/82) | `claude/claude-md` | Открыт, не draft. Контекст для другого ассистента; согласовать с этим handoff, не объявлять старые факты текущими. |
| Этот PR | `docs/assistant-handoff` | Только docs/HANDOFF.md. Оставить отдельным PR для ревью; не сливать автоматически. |

[#80](https://github.com/mirkormanbek/lucky-wholesale/pull/80) (проверка FTPS) и [#74](https://github.com/mirkormanbek/lucky-wholesale/pull/74) (старый pipeline шлемов) **закрыты без слияния**. #79 и #78 уже объединены. Статусы рабочих веток ниже отражают факт слияния PR, а не обещание, что каждый SHA является прямым предком main (использовались squash merges).

## 7. Все существующие ветки на момент передачи

Main на момент снимка: `a0c689afd589408269ca5010895ce5946f65e1a6`. Через API получены все **83** ветки (одна страница, лимит 100). Ветки не удалялись, не перебазировались и не объединялись при подготовке handoff. «PR объединён; ветка сохранена» означает исторический остаток: не считать её активной задачей и не удалять без отдельного решения.

| Ветка | Связанный PR / состояние |
| --- | --- |
| `claude/claude-md` | [#82](https://github.com/mirkormanbek/lucky-wholesale/pull/82) — открыт |
| `claude/ftps-check` | [#80](https://github.com/mirkormanbek/lucky-wholesale/pull/80) — закрыт без слияния; ветка сохранена |
| `claude/ftps-deploy` | [#81](https://github.com/mirkormanbek/lucky-wholesale/pull/81) — открыт |
| `codex/wholesale-leads-seo` | [#79](https://github.com/mirkormanbek/lucky-wholesale/pull/79) — объединён; ветка сохранена |
| `draft/headguard-source-integrity` | [#72](https://github.com/mirkormanbek/lucky-wholesale/pull/72) — объединён; ветка сохранена |
| `feat/catalog-pagination` | [#5](https://github.com/mirkormanbek/lucky-wholesale/pull/5) — объединён; ветка сохранена |
| `feat/category-photo-compositions` | [#43](https://github.com/mirkormanbek/lucky-wholesale/pull/43) — объединён; ветка сохранена |
| `feat/choose-product-cover` | [#52](https://github.com/mirkormanbek/lucky-wholesale/pull/52) — объединён; ветка сохранена |
| `feat/compact-catalog-filters` | [#7](https://github.com/mirkormanbek/lucky-wholesale/pull/7) — объединён; ветка сохранена |
| `feat/company-facts-russian-contacts` | [#10](https://github.com/mirkormanbek/lucky-wholesale/pull/10) — объединён; ветка сохранена |
| `feat/expanded-combat-categories` | [#35](https://github.com/mirkormanbek/lucky-wholesale/pull/35) — объединён; ветка сохранена |
| `feat/hand-wrap-photo-composition` | [#53](https://github.com/mirkormanbek/lucky-wholesale/pull/53) — объединён; ветка сохранена |
| `feat/harness-and-sambo-sets` | [#59](https://github.com/mirkormanbek/lucky-wholesale/pull/59) — объединён; ветка сохранена |
| `feat/headguard-reference-pipeline` | [#69](https://github.com/mirkormanbek/lucky-wholesale/pull/69) — объединён; ветка сохранена |
| `feat/headguard-sport-portrait` | [#67](https://github.com/mirkormanbek/lucky-wholesale/pull/67) — объединён; ветка сохранена |
| `feat/kickboxing-pants` | [#37](https://github.com/mirkormanbek/lucky-wholesale/pull/37) — объединён; ветка сохранена |
| `feat/manual-additional-categories` | [#50](https://github.com/mirkormanbek/lucky-wholesale/pull/50) — объединён; ветка сохранена |
| `feat/manual-removal-warehouse-search` | [#21](https://github.com/mirkormanbek/lucky-wholesale/pull/21) — объединён; ветка сохранена |
| `feat/mouthguard-in-use-composition` | [#54](https://github.com/mirkormanbek/lucky-wholesale/pull/54) — объединён; ветка сохранена |
| `feat/numbered-pagination` | [#27](https://github.com/mirkormanbek/lucky-wholesale/pull/27) — объединён; ветка сохранена |
| `feat/product-wb-link` | [#12](https://github.com/mirkormanbek/lucky-wholesale/pull/12) — объединён; ветка сохранена |
| `feat/select-studio-reference-photos` | [#55](https://github.com/mirkormanbek/lucky-wholesale/pull/55) — объединён; ветка сохранена |
| `feat/sport-and-product-taxonomy` | [#51](https://github.com/mirkormanbek/lucky-wholesale/pull/51) — объединён; ветка сохранена |
| `feat/sport-product-types-and-materials` | [#36](https://github.com/mirkormanbek/lucky-wholesale/pull/36) — объединён; ветка сохранена |
| `feat/store-traffic-dashboard` | [#62](https://github.com/mirkormanbek/lucky-wholesale/pull/62) — объединён; ветка сохранена |
| `feat/studio-headguard-closeup` | [#66](https://github.com/mirkormanbek/lucky-wholesale/pull/66) — объединён; ветка сохранена |
| `feat/studio-one-generator-comparison` | [#78](https://github.com/mirkormanbek/lucky-wholesale/pull/78) — объединён; ветка сохранена |
| `feat/transparent-sport-artwork` | [#49](https://github.com/mirkormanbek/lucky-wholesale/pull/49) — объединён; ветка сохранена |
| `feat/trash-category-created-date` | [#23](https://github.com/mirkormanbek/lucky-wholesale/pull/23) — объединён; ветка сохранена |
| `feat/visual-sport-discovery` | [#47](https://github.com/mirkormanbek/lucky-wholesale/pull/47) — объединён; ветка сохранена |
| `feat/warehouse-color-batch` | [#15](https://github.com/mirkormanbek/lucky-wholesale/pull/15) — объединён; ветка сохранена |
| `feat/warehouse-entry` | [#13](https://github.com/mirkormanbek/lucky-wholesale/pull/13) — объединён; ветка сохранена |
| `feat/warehouse-photo-instructions` | [#17](https://github.com/mirkormanbek/lucky-wholesale/pull/17) — объединён; ветка сохранена |
| `feat/warehouse-photo-studio` | [#41](https://github.com/mirkormanbek/lucky-wholesale/pull/41) — объединён; ветка сохранена |
| `feat/warehouse-photo-viewer` | [#14](https://github.com/mirkormanbek/lucky-wholesale/pull/14) — объединён; ветка сохранена |
| `feat/warehouse-seller-cabinet-ui` | [#39](https://github.com/mirkormanbek/lucky-wholesale/pull/39) — объединён; ветка сохранена |
| `feat/wb-owner-prices` | [#19](https://github.com/mirkormanbek/lucky-wholesale/pull/19) — объединён; ветка сохранена |
| `feat/wholesale-category-navigation` | [#6](https://github.com/mirkormanbek/lucky-wholesale/pull/6) — объединён; ветка сохранена |
| `fix/belt-composition-priority` | [#45](https://github.com/mirkormanbek/lucky-wholesale/pull/45) — объединён; ветка сохранена |
| `fix/belt-packaging-prompt` | [#42](https://github.com/mirkormanbek/lucky-wholesale/pull/42) — объединён; ветка сохранена |
| `fix/belt-source-only-markings` | [#46](https://github.com/mirkormanbek/lucky-wholesale/pull/46) — объединён; ветка сохранена |
| `fix/brand-ticker-css-cache` | [#3](https://github.com/mirkormanbek/lucky-wholesale/pull/3) — объединён; ветка сохранена |
| `fix/brand-ticker-motion` | [#2](https://github.com/mirkormanbek/lucky-wholesale/pull/2) — объединён; ветка сохранена |
| `fix/brand-ticker-optical-sizing` | [#1](https://github.com/mirkormanbek/lucky-wholesale/pull/1) — объединён; ветка сохранена |
| `fix/catalog-touch-filters` | [#8](https://github.com/mirkormanbek/lucky-wholesale/pull/8) — объединён; ветка сохранена |
| `fix/compact-catalog-cards` | [#25](https://github.com/mirkormanbek/lucky-wholesale/pull/25) — объединён; ветка сохранена |
| `fix/customer-currency-conversion` | [#24](https://github.com/mirkormanbek/lucky-wholesale/pull/24) — объединён; ветка сохранена |
| `fix/default-category-fit-reference` | [#70](https://github.com/mirkormanbek/lucky-wholesale/pull/70) — объединён; ветка сохранена |
| `fix/default-usd` | [#26](https://github.com/mirkormanbek/lucky-wholesale/pull/26) — объединён; ветка сохранена |
| `fix/deploy-media-before-page` | [#31](https://github.com/mirkormanbek/lucky-wholesale/pull/31) — объединён; ветка сохранена |
| `fix/deploy-studio-before-media` | [#77](https://github.com/mirkormanbek/lucky-wholesale/pull/77) — объединён; ветка сохранена |
| `fix/gi-include-source-belt` | [#56](https://github.com/mirkormanbek/lucky-wholesale/pull/56) — объединён; ветка сохранена |
| `fix/headguard-physical-fit` | [#68](https://github.com/mirkormanbek/lucky-wholesale/pull/68) — объединён; ветка сохранена |
| `fix/headguard-source-orientation` | [#76](https://github.com/mirkormanbek/lucky-wholesale/pull/76) — объединён; ветка сохранена |
| `fix/inline-contact-icons` | [#11](https://github.com/mirkormanbek/lucky-wholesale/pull/11) — объединён; ветка сохранена |
| `fix/keep-pagination-arrows` | [#28](https://github.com/mirkormanbek/lucky-wholesale/pull/28) — объединён; ветка сохранена |
| `fix/mobile-brand-names` | [#4](https://github.com/mirkormanbek/lucky-wholesale/pull/4) — объединён; ветка сохранена |
| `fix/mobile-sport-picker-viewport` | [#9](https://github.com/mirkormanbek/lucky-wholesale/pull/9) — объединён; ветка сохранена |
| `fix/pause-unreliable-headguard-modeling` | [#73](https://github.com/mirkormanbek/lucky-wholesale/pull/73) — объединён; ветка сохранена |
| `fix/photo-owner-edits-and-exact-rotation` | [#38](https://github.com/mirkormanbek/lucky-wholesale/pull/38) — объединён; ветка сохранена |
| `fix/portrait-catalog-generation` | [#44](https://github.com/mirkormanbek/lucky-wholesale/pull/44) — объединён; ветка сохранена |
| `fix/preserve-uniform-set-shorts` | [#60](https://github.com/mirkormanbek/lucky-wholesale/pull/60) — объединён; ветка сохранена |
| `fix/product-detail-gallery-and-facts` | [#33](https://github.com/mirkormanbek/lucky-wholesale/pull/33) — объединён; ветка сохранена |
| `fix/production-video-montages` | [#32](https://github.com/mirkormanbek/lucky-wholesale/pull/32) — объединён; ветка сохранена |
| `fix/remove-photo-daily-cap` | [#18](https://github.com/mirkormanbek/lucky-wholesale/pull/18) — объединён; ветка сохранена |
| `fix/restore-wb-catalog` | [#20](https://github.com/mirkormanbek/lucky-wholesale/pull/20) — объединён; ветка сохранена |
| `fix/rotation-size-and-result-correction` | [#40](https://github.com/mirkormanbek/lucky-wholesale/pull/40) — объединён; ветка сохранена |
| `fix/rub-default-currency` | [#34](https://github.com/mirkormanbek/lucky-wholesale/pull/34) — объединён; ветка сохранена |
| `fix/simple-headguard-prompt` | [#75](https://github.com/mirkormanbek/lucky-wholesale/pull/75) — объединён; ветка сохранена |
| `fix/source-driven-headguard-fit-v5` | [#74](https://github.com/mirkormanbek/lucky-wholesale/pull/74) — закрыт без слияния; ветка сохранена |
| `fix/studio-boxing-kit` | [#64](https://github.com/mirkormanbek/lucky-wholesale/pull/64) — объединён; ветка сохранена |
| `fix/studio-error-diagnostics` | [#63](https://github.com/mirkormanbek/lucky-wholesale/pull/63) — объединён; ветка сохранена |
| `fix/studio-mixed-version-startup` | [#57](https://github.com/mirkormanbek/lucky-wholesale/pull/57) — объединён; ветка сохранена |
| `fix/studio-original-markings` | [#61](https://github.com/mirkormanbek/lucky-wholesale/pull/61) — объединён; ветка сохранена |
| `fix/studio-shinguard-framing` | [#65](https://github.com/mirkormanbek/lucky-wholesale/pull/65) — объединён; ветка сохранена |
| `fix/universal-source-driven-headguards` | [#71](https://github.com/mirkormanbek/lucky-wholesale/pull/71) — объединён; ветка сохранена |
| `fix/warehouse-add-color-visible` | [#16](https://github.com/mirkormanbek/lucky-wholesale/pull/16) — объединён; ветка сохранена |
| `fix/wb-admin-photo-path` | [#22](https://github.com/mirkormanbek/lucky-wholesale/pull/22) — объединён; ветка сохранена |
| `fix/wraps-preserve-source-structure` | [#58](https://github.com/mirkormanbek/lucky-wholesale/pull/58) — объединён; ветка сохранена |
| `main` | Production/main; изменения могут запускать выкладку. |
| `preview/about-production-stores` | [#29](https://github.com/mirkormanbek/lucky-wholesale/pull/29) — открыт, draft |
| `release/company-proof` | [#30](https://github.com/mirkormanbek/lucky-wholesale/pull/30) — объединён; ветка сохранена |
| `style/sport-cards-dark` | [#48](https://github.com/mirkormanbek/lucky-wholesale/pull/48) — объединён; ветка сохранена |
| `docs/assistant-handoff` | Новая ветка этого отдельного PR; добавляется к снимку из 83 веток. |

## 8. Перед первым изменением нового ассистента

Перечитать актуальные main, открытые PR и инструкции владельца; уточнить, какая задача действительно следующая. По умолчанию не выполнять деплой, импорт, платную генерацию или восстановление старой автоматизации из одного факта чтения этого файла. Не запрашивать секреты в публичной переписке. При продолжении выпуска проверять конкретный SHA и production, а в ответе владельцу сразу давать понятный следующий шаг.
