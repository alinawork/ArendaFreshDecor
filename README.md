# Fresh Decor — мини-приложение Telegram 

Каталог декора для аренды. Клиент листает каталог, нажимает «Уточнить»,
открывается чат с менеджером с готовым сообщением.

## Что внутри 

```
arenda_freshdecor/
├── index.html          ← мини-приложение (главная)
├── styles.css
├── app.js
├── logo.png            ← твой логотип
├── data.json           ← каталог (обновляется парсером)
├── build_catalog.py    ← парсер таблицы → JSON
├── AppsScript.gs       ← скрипт для Google Sheets (фото)
├── bot.py              ← Telegram-бот
├── requirements.txt
└── README.md
```
