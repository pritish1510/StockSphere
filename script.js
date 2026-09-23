const GST_RATE = 0.18;
const LOW_STOCK_LIMIT = 5;
const EXPIRY_WARNING_DAYS = 7;

let products = loadProducts();
let bill = [];
let notifications = [];

function loadProducts() {
    try {
        const savedProducts = JSON.parse(localStorage.getItem("products"));
        return Array.isArray(savedProducts) ? savedProducts : [];
    } catch (error) {
        console.error("Could not load saved products:", error);
        return [];
    }
}

function saveProducts() {
    localStorage.setItem("products", JSON.stringify(products));
}

function login(event) {
    if (event) event.preventDefault();

    const username = document.getElementById("username").value.trim().toLowerCase();
    const password = document.getElementById("password").value;
    const credentials = {
        admin: "1234",
        employee: "1234"
    };

    if (credentials[username] !== password) {
        document.getElementById("loginMessage").textContent = "Invalid credentials. Try again.";
        return;
    }

    sessionStorage.setItem("role", username);
    document.getElementById("loginMessage").textContent = "";
    showApplication(username);
}

function showApplication(role) {
    document.getElementById("loginPage").hidden = true;
    document.getElementById("mainContent").hidden = false;
    document.getElementById("userRole").textContent = `Signed in as ${role}`;

    const isAdmin = role === "admin";
    document.querySelectorAll(".admin-only").forEach(element => {
        element.hidden = !isAdmin;
    });

    updateProductDropdown();
    updateProductTable();
    updateBill();
    checkAlerts();

    // Admin starts on Inventory; employee gets only Billing and Export Data.
    const defaultTabName = isAdmin ? "Inventory" : "Billing";
    const defaultButton = document.querySelector(
        `.tablinks[onclick*="${defaultTabName}"]`
    );
    openTab({ currentTarget: defaultButton }, defaultTabName);
}

function logout() {
    sessionStorage.removeItem("role");
    bill = [];
    updateBill();
    document.getElementById("mainContent").hidden = true;
    document.getElementById("loginPage").hidden = false;
    document.getElementById("loginForm").reset();
}

function openTab(evt, tabName) {
    const role = sessionStorage.getItem("role");
    if (role !== "admin" && (tabName === "Inventory" || tabName === "ProductList")) {
        alert("Employees can access only Billing and Export Data.");
        return;
    }

    document.querySelectorAll(".tabcontent").forEach(tab => {
        tab.classList.remove("active");
    });

    document.querySelectorAll(".tablinks").forEach(button => {
        button.classList.remove("active");
    });

    const selectedTab = document.getElementById(tabName);
    if (selectedTab) selectedTab.classList.add("active");
    if (evt && evt.currentTarget) evt.currentTarget.classList.add("active");

    if (tabName === "ProductList") updateProductTable();
    if (tabName === "Billing") updateProductDropdown();
}

function updateProductDropdown() {
    const dropdown = document.getElementById("billingProductDropdown");
    if (!dropdown) return;

    dropdown.replaceChildren();
    const defaultOption = document.createElement("option");
    defaultOption.value = "";
    defaultOption.textContent = "Select a Product";
    defaultOption.disabled = true;
    defaultOption.selected = true;
    dropdown.appendChild(defaultOption);

    products
        .filter(product => Number(product.quantity) > 0)
        .sort((a, b) => a.name.localeCompare(b.name))
        .forEach(product => {
            const option = document.createElement("option");
            option.value = product.name;
            option.textContent = `${product.name} (Stock: ${product.quantity})`;
            dropdown.appendChild(option);
        });
}

function addProduct() {
    if (sessionStorage.getItem("role") !== "admin") {
        alert("Only an admin can add products.");
        return;
    }

    const name = document.getElementById("productName").value.trim();
    const price = Number.parseFloat(document.getElementById("productPrice").value);
    const quantity = Number.parseInt(document.getElementById("productQuantity").value, 10);
    const expiryDate = document.getElementById("expiryDate").value;

    if (!name || !Number.isFinite(price) || price <= 0 || !Number.isInteger(quantity) || quantity <= 0 || !expiryDate) {
        alert("Please enter a product name, a price greater than 0, a positive whole quantity and an expiry date.");
        return;
    }

    const existingProduct = products.find(
        product => product.name.trim().toLowerCase() === name.toLowerCase()
    );

    if (existingProduct) {
        existingProduct.quantity = Number(existingProduct.quantity) + quantity;
        existingProduct.expiryDate = expiryDate;
        existingProduct.price = price;
    } else {
        products.push({ name, price, quantity, expiryDate });
    }

    saveProducts();
    updateProductTable();
    updateProductDropdown();
    checkAlerts();

    document.getElementById("productName").value = "";
    document.getElementById("productPrice").value = "";
    document.getElementById("productQuantity").value = "";
    document.getElementById("expiryDate").value = "";
}

function addToBill() {
    const productName = document.getElementById("billingProductDropdown").value;
    const quantity = Number.parseInt(document.getElementById("billingQuantity").value, 10);
    const product = products.find(item => item.name === productName);

    if (!product) {
        alert("Please select a valid product.");
        return;
    }

    if (!Number.isInteger(quantity) || quantity <= 0) {
        alert("Please enter a positive whole quantity.");
        return;
    }

    if (Number(product.quantity) < quantity) {
        alert(`Only ${product.quantity} item(s) are available in stock.`);
        return;
    }

    const existingBillItem = bill.find(item => item.name === product.name);
    if (existingBillItem) {
        existingBillItem.quantity += quantity;
    } else {
        bill.push({
            name: product.name,
            price: Number(product.price),
            quantity
        });
    }

    product.quantity = Number(product.quantity) - quantity;
    saveProducts();

    document.getElementById("billingQuantity").value = "";
    updateProductTable();
    updateProductDropdown();
    updateBill();
    checkAlerts();
}

function removeBillItem(index) {
    const item = bill[index];
    if (!item) return;

    const product = products.find(productItem => productItem.name === item.name);
    if (product) {
        product.quantity = Number(product.quantity) + Number(item.quantity);
    }

    bill.splice(index, 1);
    saveProducts();
    updateProductTable();
    updateProductDropdown();
    updateBill();
    checkAlerts();
}

function calculateBillTotals() {
    const subtotal = bill.reduce(
        (sum, item) => sum + Number(item.price) * Number(item.quantity),
        0
    );
    const tax = subtotal * GST_RATE;
    return { subtotal, tax, total: subtotal + tax };
}

function updateBill() {
    const billList = document.getElementById("billList");
    if (!billList) return;

    billList.replaceChildren();

    bill.forEach((item, index) => {
        const itemTotal = Number(item.price) * Number(item.quantity);
        const listItem = document.createElement("li");

        const description = document.createElement("span");
        description.textContent = `${item.name} — ${item.quantity} × ₹${Number(item.price).toFixed(2)} = ₹${itemTotal.toFixed(2)}`;

        const removeButton = document.createElement("button");
        removeButton.type = "button";
        removeButton.className = "danger-button compact-button";
        removeButton.textContent = "Remove";
        removeButton.addEventListener("click", () => removeBillItem(index));

        listItem.append(description, removeButton);
        billList.appendChild(listItem);
    });

    const { subtotal, tax, total } = calculateBillTotals();
    document.getElementById("subtotalAmount").textContent = subtotal.toFixed(2);
    document.getElementById("taxAmount").textContent = tax.toFixed(2);
    document.getElementById("totalAmount").textContent = total.toFixed(2);
}

function updateProductTable(productList = products) {
    const table = document.getElementById("productTable");
    if (!table) return;

    const tbody = table.querySelector("tbody");
    const emptyMessage = document.getElementById("emptyProductMessage");
    tbody.replaceChildren();

    productList
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name))
        .forEach(product => {
            const row = document.createElement("tr");
            const values = [
                product.name,
                `₹${Number(product.price).toFixed(2)}`,
                product.quantity,
                formatDate(product.expiryDate)
            ];

            values.forEach(value => {
                const cell = document.createElement("td");
                cell.textContent = value;
                row.appendChild(cell);
            });

            const actionCell = document.createElement("td");
            const deleteButton = document.createElement("button");
            deleteButton.type = "button";
            deleteButton.className = "danger-button compact-button";
            deleteButton.textContent = "Delete";
            deleteButton.addEventListener("click", () => deleteProduct(product.name));
            actionCell.appendChild(deleteButton);
            row.appendChild(actionCell);
            tbody.appendChild(row);
        });

    if (emptyMessage) emptyMessage.hidden = productList.length !== 0;
}

function searchProducts() {
    const searchTerm = document.getElementById("searchProduct").value.trim().toLowerCase();
    const filteredProducts = products.filter(product =>
        product.name.toLowerCase().includes(searchTerm)
    );
    updateProductTable(filteredProducts);
}

function deleteProduct(name) {
    if (sessionStorage.getItem("role") !== "admin") {
        alert("Only an admin can delete products.");
        return;
    }

    if (bill.some(item => item.name === name)) {
        alert("This product is currently in the bill. Remove it from the bill before deleting it.");
        return;
    }

    const shouldDelete = window.confirm(`Delete "${name}" from inventory?`);
    if (!shouldDelete) return;

    products = products.filter(product => product.name !== name);
    saveProducts();
    updateProductTable();
    updateProductDropdown();
    checkAlerts();
}

function checkAlerts() {
    const alertsElement = document.getElementById("alerts");
    if (!alertsElement) return;

    notifications = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const warningDate = new Date(today);
    warningDate.setDate(warningDate.getDate() + EXPIRY_WARNING_DAYS);

    products.forEach(product => {
        if (Number(product.quantity) <= LOW_STOCK_LIMIT) {
            notifications.push(`${product.name}: low stock (${product.quantity} remaining).`);
        }

        const expiryDate = parseLocalDate(product.expiryDate);
        if (expiryDate && expiryDate < today) {
            notifications.push(`${product.name}: expired on ${formatDate(product.expiryDate)}.`);
        } else if (expiryDate && expiryDate <= warningDate) {
            notifications.push(`${product.name}: expires on ${formatDate(product.expiryDate)}.`);
        }
    });

    alertsElement.replaceChildren();
    if (notifications.length === 0) {
        alertsElement.hidden = true;
        return;
    }

    const heading = document.createElement("strong");
    heading.textContent = "Inventory alerts";
    const list = document.createElement("ul");
    notifications.forEach(message => {
        const item = document.createElement("li");
        item.textContent = message;
        list.appendChild(item);
    });

    alertsElement.append(heading, list);
    alertsElement.hidden = false;
}

function exportToExcel() {
    if (products.length === 0) {
        alert("There are no products to export.");
        return;
    }

    const rows = [
        ["Name", "Price", "Quantity", "Expiry Date"],
        ...products.map(product => [
            product.name,
            Number(product.price).toFixed(2),
            product.quantity,
            product.expiryDate
        ])
    ];

    const csvContent = rows
        .map(row => row.map(csvEscape).join(","))
        .join("\r\n");

    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8" });
    const downloadUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = "inventory.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(downloadUrl);
}

function csvEscape(value) {
    const text = String(value ?? "");
    return `"${text.replace(/"/g, '""')}"`;
}

function generateInvoice() {
    const clientName = document.getElementById("clientName").value.trim();
    const clientAddress = document.getElementById("clientAddress").value.trim();
    const clientContact = document.getElementById("clientContact").value.trim();

    if (!clientName || !clientAddress || !clientContact) {
        alert("Please fill in all client information fields.");
        return;
    }

    if (bill.length === 0) {
        alert("Please add at least one product to the bill.");
        return;
    }

    const now = new Date();
    const dueDate = new Date(now);
    dueDate.setDate(dueDate.getDate() + 30);
    const { subtotal, tax, total } = calculateBillTotals();

    const itemRows = bill.map(item => {
        const itemTotal = Number(item.price) * Number(item.quantity);
        return `
            <tr>
                <td>${escapeHTML(item.name)}</td>
                <td>${Number(item.quantity)}</td>
                <td>₹${Number(item.price).toFixed(2)}</td>
                <td>₹${itemTotal.toFixed(2)}</td>
            </tr>`;
    }).join("");

    document.getElementById("invoiceContent").innerHTML = `
        <div class="invoice-heading">
            <div>
                <h2>StockSphere</h2>
                <p>Dronacharya Group of Institutions</p>
                <p>Contact: 99xxxxxx09 · email@StockSphere.com</p>
            </div>
            <div>
                <h3>Invoice</h3>
                <p>Invoice No: INV-${now.getTime()}</p>
                <p>Invoice Date: ${formatDisplayDate(now)}</p>
                <p>Due Date: ${formatDisplayDate(dueDate)}</p>
            </div>
        </div>

        <h3>Client Information</h3>
        <p>Name: ${escapeHTML(clientName)}</p>
        <p>Address: ${escapeHTML(clientAddress)}</p>
        <p>Contact: ${escapeHTML(clientContact)}</p>

        <div class="table-wrapper">
            <table id="invoiceTable">
                <thead>
                    <tr>
                        <th>Product/Service</th>
                        <th>Quantity</th>
                        <th>Unit Price</th>
                        <th>Total Price</th>
                    </tr>
                </thead>
                <tbody>${itemRows}</tbody>
            </table>
        </div>

        <div class="invoice-summary">
            <p>Subtotal: ₹${subtotal.toFixed(2)}</p>
            <p>Taxes (18% GST): ₹${tax.toFixed(2)}</p>
            <h3>Total Amount Due: ₹${total.toFixed(2)}</h3>
        </div>

        <h3>Payment Instructions</h3>
        <p>Bank Account: 1234567890</p>
        <p>IFSC: ABCD0123456</p>
        <p>Other Methods: PayPal — paypal@company.com</p>
    `;

    document.getElementById("invoiceSection").hidden = false;
}

function printInvoice() {
    const invoiceContent = document.getElementById("invoiceContent").innerHTML;
    if (!invoiceContent.trim()) {
        alert("Please generate an invoice first.");
        return;
    }

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
        alert("The print window was blocked. Please allow pop-ups and try again.");
        return;
    }

    printWindow.document.write(`<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <title>StockSphere Invoice</title>
            <style>
                body { font-family: Arial, sans-serif; color: #222; margin: 32px; }
                .invoice-heading { display: flex; justify-content: space-between; gap: 32px; }
                table { width: 100%; border-collapse: collapse; margin: 24px 0; }
                th, td { border: 1px solid #bbb; padding: 9px; text-align: left; }
                th { background: #eee; }
                .invoice-summary { text-align: right; }
            </style>
        </head>
        <body>${invoiceContent}</body>
        </html>`);
    printWindow.document.close();
    printWindow.focus();
    printWindow.onload = () => {
        printWindow.print();
        printWindow.close();
    };
}

function escapeHTML(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function parseLocalDate(dateString) {
    if (!dateString) return null;
    const [year, month, day] = dateString.split("-").map(Number);
    if (!year || !month || !day) return null;
    return new Date(year, month - 1, day);
}

function formatDate(dateString) {
    const date = parseLocalDate(dateString);
    return date ? formatDisplayDate(date) : "—";
}

function formatDisplayDate(date) {
    return date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric"
    });
}

window.addEventListener("DOMContentLoaded", () => {
    updateProductTable();
    updateProductDropdown();
    updateBill();
    checkAlerts();

    const savedRole = sessionStorage.getItem("role");
    if (savedRole === "admin" || savedRole === "employee") {
        showApplication(savedRole);
    }
});
