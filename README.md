# TripSplit

A simple static trip-expense splitter built with plain HTML, CSS and JavaScript.

## Files

- `index.html` — website structure
- `style.css` — responsive styling
- `script.js` — calculations and interactions

## What it handles

- Multiple people
- Any number of expenses
- Cash, UPI, credit card, debit card, bank transfer and other payment methods
- One payer or multiple payers for a single expense
- Equal split among selected people
- Custom split amounts
- Different people benefiting from different expenses
- Expense deletion
- Final net balances
- Settlement transfers between debtors and creditors
- Rounding of displayed settlement amounts to the nearest rupee
- Validation so payer totals and share totals must exactly match the expense
- Export/import of trip data as JSON
- No backend, account or internet connection required

## Important calculation rule

Payment method is descriptive only. A ₹1,000 expense paid by UPI is treated exactly like a ₹1,000 expense paid in cash. The balance is based on actual money paid versus the person's assigned share.

For each person:

`Net balance = Total paid - Total share`

- Positive = person should receive money
- Negative = person needs to pay money
- Zero = settled

The settlement algorithm matches people who owe money with people who should receive money, producing a compact set of transfers.

## Run it

Open `index.html` directly in a browser.

For hosting, upload all three files to any static host such as GitHub Pages, Netlify, Vercel static hosting, or a normal web host.

## Data privacy

Trip data is kept in the current browser page. Export creates a local JSON backup. There is no server/database in this version.
