const state = {
  people: [],
  expenses: [],
  splitMode: "equal"
};

const $ = id => document.getElementById(id);
const money = n => "₹" + Number(n || 0).toLocaleString("en-IN", {minimumFractionDigits: 2, maximumFractionDigits: 2});
const roundedMoney = n => Math.round(Number(n || 0));
const today = new Date().toISOString().slice(0,10);

function showMessage(text, type="") {
  const el = $("message");
  el.textContent = text;
  el.className = "message " + type;
  el.hidden = false;
  clearTimeout(showMessage.timer);
  showMessage.timer = setTimeout(() => el.hidden = true, 3200);
}
function initials(name) {
  return name.trim().split(/\s+/).slice(0,2).map(x => x[0].toUpperCase()).join("");
}
function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
}
function personById(id) { return state.people.find(p => p.id === id); }

function renderPeople() {
  const list = $("peopleList");
  if (!state.people.length) {
    list.className = "people-list empty-state";
    list.innerHTML = "No people added yet.";
  } else {
    list.className = "people-list";
    list.innerHTML = state.people.map(p => `
      <div class="person-chip">
        <span class="person-avatar">${initials(p.name)}</span>
        <span>${escapeHtml(p.name)}</span>
        <button class="remove-btn" title="Remove ${escapeHtml(p.name)}" data-remove-person="${p.id}">×</button>
      </div>`).join("");
  }
  $("peopleCount").textContent = `${state.people.length} ${state.people.length === 1 ? "person" : "people"}`;
  renderExpenseForm();
  renderExpenses();
  calculateAndRender();
}
function renderExpenseForm() {
  const ready = state.people.length >= 2;
  $("expenseForm").hidden = !ready;
  $("expenseEmpty").hidden = ready;
  if (ready) {
    renderPayerRows();
    renderSplitRows();
  }
}
function renderPayerRows(existing = null) {
  const values = existing || Object.fromEntries(state.people.map(p => [p.id, 0]));
  $("payerRows").innerHTML = state.people.map(p => `
    <div class="allocation-row">
      <div class="allocation-person"><span class="avatar">${initials(p.name)}</span><span>${escapeHtml(p.name)}</span></div>
      <input class="payer-input" data-id="${p.id}" type="number" min="0" step="0.01" value="${Number(values[p.id] || 0)}" placeholder="0.00">
    </div>`).join("");
  updatePayerTotal();
}
function renderSplitRows(existing = null) {
  const values = existing || Object.fromEntries(state.people.map(p => [p.id, false]));
  const custom = existing && typeof Object.values(existing)[0] === "number";
  $("splitRows").className = "split-rows " + (state.splitMode === "custom" ? "custom-mode" : "");
  $("splitRows").innerHTML = state.people.map(p => {
    const selected = custom ? Number(values[p.id] || 0) > 0 : !!values[p.id];
    const val = custom ? Number(values[p.id] || 0) : "";
    return `
      <div class="check-row">
        <input class="split-check" data-id="${p.id}" type="checkbox" ${selected ? "checked" : ""}>
        <span class="allocation-person" style="flex:1"><span class="avatar">${initials(p.name)}</span>${escapeHtml(p.name)}</span>
        <span class="equal-hint" style="font-size:11px;color:#8791a1">Equal share</span>
        <input class="custom-input split-input" data-id="${p.id}" type="number" min="0" step="0.01" value="${val}" placeholder="0.00">
      </div>`;
  }).join("");
  updateSplitTotal();
}
function updatePayerTotal() {
  let total = 0;
  document.querySelectorAll(".payer-input").forEach(i => total += Math.max(0, Number(i.value) || 0));
  $("payerTotal").textContent = money(total);
  const amount = Number($("expenseAmount").value) || 0;
  $("payerTotal").style.color = Math.abs(total - amount) < .005 ? "var(--green)" : "";
}
function updateSplitTotal() {
  const amount = Number($("expenseAmount").value) || 0;
  let total = 0;
  if (state.splitMode === "equal") {
    total = document.querySelectorAll(".split-check:checked").length ? amount : 0;
  } else {
    document.querySelectorAll(".split-input").forEach(i => total += Math.max(0, Number(i.value) || 0));
  }
  $("splitTotal").textContent = money(total);
  $("splitTotal").style.color = Math.abs(total - amount) < .005 ? "var(--green)" : "";
}
function resetExpenseForm() {
  $("expenseDescription").value = "";
  $("expenseAmount").value = "";
  $("expenseDate").value = today;
  $("paymentMethod").value = "UPI";
  state.splitMode = "equal";
  document.querySelectorAll("#splitMode button").forEach(b => b.classList.toggle("active", b.dataset.mode === "equal"));
  renderPayerRows();
  renderSplitRows();
  updatePayerTotal();
  updateSplitTotal();
}
function getExpenseInput() {
  const description = $("expenseDescription").value.trim();
  const amount = Number($("expenseAmount").value);
  const date = $("expenseDate").value || today;
  const paymentMethod = $("paymentMethod").value;
  const payers = {};
  document.querySelectorAll(".payer-input").forEach(i => {
    const v = Math.max(0, Number(i.value) || 0);
    if (v > 0) payers[i.dataset.id] = v;
  });
  const payerTotal = Object.values(payers).reduce((a,b) => a+b, 0);
  const selected = [...document.querySelectorAll(".split-check:checked")].map(i => i.dataset.id);
  const shares = {};
  if (state.splitMode === "equal") {
    if (selected.length) {
      const each = amount / selected.length;
      selected.forEach(id => shares[id] = each);
    }
  } else {
    document.querySelectorAll(".split-input").forEach(i => {
      const v = Math.max(0, Number(i.value) || 0);
      if (v > 0) shares[i.dataset.id] = v;
    });
  }
  const shareTotal = Object.values(shares).reduce((a,b) => a+b, 0);
  return {description, amount, date, paymentMethod, payers, payerTotal, shares, shareTotal};
}
function validateExpense(x) {
  if (!x.description) return "Please enter what the expense was for.";
  if (!Number.isFinite(x.amount) || x.amount <= 0) return "Please enter a valid expense amount.";
  if (!Object.keys(x.payers).length) return "Please enter who paid this expense.";
  if (Math.abs(x.payerTotal - x.amount) > 0.005) return `Payer amounts must add up to ${money(x.amount)}.`;
  if (!Object.keys(x.shares).length) return "Please select at least one person who should share this expense.";
  if (Math.abs(x.shareTotal - x.amount) > 0.005) return state.splitMode === "custom"
    ? `Custom shares must add up to ${money(x.amount)}.`
    : "Please select at least one person.";
  return "";
}

function addExpense(x) {
  state.expenses.push({
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()),
    ...x
  });
  renderExpenses();
  calculateAndRender();
  resetExpenseForm();
  showMessage("Expense added.", "success");
}
function renderExpenses() {
  $("expenseCount").textContent = `${state.expenses.length} ${state.expenses.length === 1 ? "expense" : "expenses"}`;
  const list = $("expensesList");
  if (!state.expenses.length) {
    list.className = "expense-list empty-state";
    list.innerHTML = "No expenses added yet.";
    $("expenseSummary").hidden = true;
    return;
  }
  list.className = "expense-list";
  list.innerHTML = state.expenses.map((e, idx) => {
    const payerNames = Object.entries(e.payers).map(([id,v]) => `${escapeHtml(personById(id)?.name || "Unknown")} ${money(v)}`).join(", ");
    const shareNames = Object.keys(e.shares).map(id => escapeHtml(personById(id)?.name || "Unknown")).join(", ");
    return `<div class="expense-item">
      <div class="expense-main">
        <strong>${idx+1}. ${escapeHtml(e.description)}</strong>
        <p>${escapeHtml(e.date)} • Paid by ${payerNames} • Split between ${shareNames}</p>
      </div>
      <div class="expense-amount">${money(e.amount)}</div>
      <div class="expense-method">${escapeHtml(e.paymentMethod)}</div>
      <button class="delete-expense" title="Delete expense" data-delete-expense="${e.id}">×</button>
    </div>`;
  }).join("");
  const total = state.expenses.reduce((s,e) => s + e.amount, 0);
  $("expenseSummary").hidden = false;
  $("expenseSummary").innerHTML = `
    <div><span>Total expenses</span><strong>${money(total)}</strong></div>
    <div><span>Number of expenses</span><strong>${state.expenses.length}</strong></div>
    <div><span>People sharing</span><strong>${state.people.length}</strong></div>`;
}

function calculate() {
  const result = {};
  state.people.forEach(p => result[p.id] = {paid:0, share:0, balance:0});
  state.expenses.forEach(e => {
    Object.entries(e.payers).forEach(([id,v]) => { if (result[id]) result[id].paid += Number(v); });
    Object.entries(e.shares).forEach(([id,v]) => { if (result[id]) result[id].share += Number(v); });
  });
  Object.values(result).forEach(r => r.balance = r.paid - r.share);
  return result;
}

function makeSettlement(balances) {
  const creditors = Object.entries(balances)
    .filter(([,r]) => r.balance > 0.005)
    .map(([id,r]) => ({id, amount:r.balance}))
    .sort((a,b) => b.amount-a.amount);
  const debtors = Object.entries(balances)
    .filter(([,r]) => r.balance < -0.005)
    .map(([id,r]) => ({id, amount:-r.balance}))
    .sort((a,b) => b.amount-a.amount);
  const transfers = [];
  let i=0,j=0;
  while (i<debtors.length && j<creditors.length) {
    const amount = Math.min(debtors[i].amount, creditors[j].amount);
    if (amount > 0.005) transfers.push({from:debtors[i].id,to:creditors[j].id,amount});
    debtors[i].amount -= amount; creditors[j].amount -= amount;
    if (debtors[i].amount <= .005) i++;
    if (creditors[j].amount <= .005) j++;
  }
  return transfers;
}
function calculateAndRender() {
  if (!state.expenses.length) {
    $("resultEmpty").hidden = false; $("resultContent").hidden = true; return;
  }
  const balances = calculate();
  const total = state.expenses.reduce((s,e)=>s+e.amount,0);
  const transfers = makeSettlement(balances);
  $("resultEmpty").hidden = true; $("resultContent").hidden = false;
  const paidTotal = Object.values(balances).reduce((s,r)=>s+r.paid,0);
  const shareTotal = Object.values(balances).reduce((s,r)=>s+r.share,0);
  $("totalGrid").innerHTML = `
    <div class="total-box"><span>Total trip spend</span><strong>${money(total)}</strong></div>
    <div class="total-box"><span>Total actually paid</span><strong>${money(paidTotal)}</strong></div>
    <div class="total-box"><span>Total allocated shares</span><strong>${money(shareTotal)}</strong></div>`;
  const list = $("settlementList");
  $("settledBox").hidden = transfers.length !== 0;
  if (!transfers.length) {
    list.innerHTML = "";
  } else {
    list.innerHTML = transfers.map(t => `
      <div class="settlement">
        <div class="from">${escapeHtml(personById(t.from)?.name || "Unknown")}</div>
        <div class="arrow">→</div>
        <div class="to">${escapeHtml(personById(t.to)?.name || "Unknown")}</div>
        <strong>${money(roundedMoney(t.amount))}</strong>
      </div>`).join("");
  }
  $("balanceBody").innerHTML = state.people.map(p => {
    const r = balances[p.id];
    const cls = r.balance > .005 ? "positive" : r.balance < -.005 ? "negative" : "";
    const label = r.balance > .005 ? `+${money(r.balance)}` : r.balance < -.005 ? `-${money(Math.abs(r.balance))}` : money(0);
    return `<tr><td>${escapeHtml(p.name)}</td><td>${money(r.paid)}</td><td>${money(r.share)}</td><td class="${cls}">${label}</td></tr>`;
  }).join("");
}

function saveData() {
  const payload = {app:"TripSplit",version:1,exportedAt:new Date().toISOString(),people:state.people,expenses:state.expenses};
  const blob = new Blob([JSON.stringify(payload,null,2)], {type:"application/json"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href=url; a.download="tripsplit-backup.json"; a.click(); URL.revokeObjectURL(url);
  showMessage("Backup exported.", "success");
}
function loadData(payload) {
  if (!payload || !Array.isArray(payload.people) || !Array.isArray(payload.expenses)) throw new Error("Invalid TripSplit backup.");
  const people = payload.people.map(p => ({id:String(p.id),name:String(p.name).trim()})).filter(p=>p.name);
  const ids = new Set(people.map(p=>p.id));
  const expenses = payload.expenses.map(e => {
    const payers = Object.fromEntries(Object.entries(e.payers||{}).filter(([id,v])=>ids.has(id)).map(([id,v])=>[id,Number(v)]));
    const shares = Object.fromEntries(Object.entries(e.shares||{}).filter(([id,v])=>ids.has(id)).map(([id,v])=>[id,Number(v)]));
    return {id:String(e.id||Date.now()+Math.random()),description:String(e.description||"Expense"),amount:Number(e.amount)||0,date:String(e.date||today),paymentMethod:String(e.paymentMethod||"Other"),payers,shares,payerTotal:Object.values(payers).reduce((a,b)=>a+b,0),shareTotal:Object.values(shares).reduce((a,b)=>a+b,0)};
  }).filter(e=>e.amount>0);
  state.people=people; state.expenses=expenses;
  renderPeople();
  if (state.people.length>=2) resetExpenseForm();
  showMessage("Backup imported.", "success");
}
function newTrip() {
  if ((state.people.length || state.expenses.length) && !confirm("Start a new trip? Your current trip will be cleared from this page.")) return;
  state.people=[];state.expenses=[];renderPeople();resetExpenseForm();showMessage("New trip started.");
}

$("personForm").addEventListener("submit", e => {
  e.preventDefault();
  const name=$("personName").value.trim();
  if(!name) return showMessage("Enter a person's name.","error");
  if(state.people.some(p=>p.name.toLowerCase()===name.toLowerCase())) return showMessage("That person is already added.","error");
  state.people.push({id:(crypto.randomUUID?crypto.randomUUID():String(Date.now()+Math.random())),name});
  $("personName").value="";
  renderPeople(); showMessage(`${name} added.`,"success");
});
$("peopleList").addEventListener("click",e=>{
  const btn=e.target.closest("[data-remove-person]"); if(!btn)return;
  const id=btn.dataset.removePerson;
  if(state.expenses.some(x=>x.payers[id] || x.shares[id])) return showMessage("This person is used in an expense. Delete those expenses first if you want to remove them.","error");
  state.people=state.people.filter(p=>p.id!==id);renderPeople();
});
$("expenseForm").addEventListener("submit",e=>{
  e.preventDefault();const x=getExpenseInput();const error=validateExpense(x);
  if(error)return showMessage(error,"error"); addExpense(x);
});
$("expenseForm").addEventListener("input",e=>{
  if(e.target.matches(".payer-input") || e.target.id==="expenseAmount") updatePayerTotal();
  if(e.target.matches(".split-input") || e.target.matches(".split-check") || e.target.id==="expenseAmount") updateSplitTotal();
});
$("expenseForm").addEventListener("change",e=>{
  if(e.target.matches(".split-check")) updateSplitTotal();
});
$("splitMode").addEventListener("click",e=>{
  const b=e.target.closest("button");if(!b)return;
  state.splitMode=b.dataset.mode;
  document.querySelectorAll("#splitMode button").forEach(x=>x.classList.toggle("active",x===b));
  renderSplitRows();
});
$("selectAllBtn").addEventListener("click",()=>{document.querySelectorAll(".split-check").forEach(x=>x.checked=true);updateSplitTotal()});
$("clearAllBtn").addEventListener("click",()=>{document.querySelectorAll(".split-check").forEach(x=>x.checked=false);updateSplitTotal()});
$("resetPayersBtn").addEventListener("click",()=>renderPayerRows());
$("expensesList").addEventListener("click",e=>{
  const btn=e.target.closest("[data-delete-expense]");if(!btn)return;
  state.expenses=state.expenses.filter(x=>x.id!==btn.dataset.deleteExpense);renderExpenses();calculateAndRender();showMessage("Expense deleted.");
});
$("saveBtn").addEventListener("click",saveData);
$("newTripBtn").addEventListener("click",newTrip);
$("loadInput").addEventListener("change",e=>{
  const file=e.target.files[0];if(!file)return;
  const reader=new FileReader();
  reader.onload=()=>{try{loadData(JSON.parse(reader.result))}catch(err){showMessage("Could not import this file.","error")}};
  reader.readAsText(file);e.target.value="";
});

$("expenseDate").value=today;
renderPeople();
document.querySelectorAll(".side-step").forEach(step => step.addEventListener("click", () => {
  document.getElementById(step.dataset.target)?.scrollIntoView({behavior:"smooth", block:"start"});
}));
