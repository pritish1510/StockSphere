// Store product and billing data
let products = JSON.parse(localStorage.getItem('products')) || []; // Load saved products or start with an empty array
let bill = []; // Stores items added to the bill
let notifications = []; // Stores notifications for products that need attention

// User Login Function
function login() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    if (username === "admin" && password === "1234") {
        sessionStorage.setItem('role', 'admin'); // Save role as admin
        document.getElementById('loginPage').style.display = 'none';
        document.getElementById('mainContent').style.display = 'block';
    } else if (username === "employee" && password === "1234") {
        sessionStorage.setItem('role', 'employee'); // Save role as employee
        document.getElementById('loginPage').style.display = 'none';
        document.getElementById('mainContent').style.display = 'block';
    } else {
        document.getElementById('loginMessage').innerText = "Invalid credentials. Try again.";
    }

    updateProductDropdown();
    checkAlerts();
}

// Change between tabs
function openTab(evt, tabName) {
    let tabcontent = document.getElementsByClassName("tabcontent");
    for (let i = 0; i < tabcontent.length; i++) {
        tabcontent[i].style.display = "none"; // Hide all tabs
    }

    let tablinks = document.getElementsByClassName("tablinks");
    for (let i = 0; i < tablinks.length; i++) {
        tablinks[i].className = tablinks[i].className.replace(" active", ""); // Remove active class
    }

    document.getElementById(tabName).style.display = "block"; // Show the selected tab
    evt.currentTarget.className += " active"; // Add active class to the selected tab
}

// Update dropdown for billing
function updateProductDropdown() {
    let dropdown = document.getElementById("billingProductDropdown");
    dropdown.innerHTML = '<option value="" disabled selected>Select a Product</option>'; // Default option

    products.forEach(product => {
        let option = document.createElement("option");
        option.value = product.name;
        option.text = product.name;
        dropdown.appendChild(option); // Add each product as an option
    });
}

// Add a new product to inventory (with duplicate merging)
function addProduct() {
    let name = document.getElementById('productName').value;
    let price = parseFloat(document.getElementById('productPrice').value);
    let quantity = parseInt(document.getElementById('productQuantity').value);
    let expiryDate = document.getElementById('expiryDate').value;

    if (!name || isNaN(price) || isNaN(quantity) || !expiryDate) {
        alert("Please fill out all fields correctly.");
        return;
    }

    // Check for duplicates
    const existingProduct = products.find(product => product.name === name);
    if (existingProduct) {
        // Merge product details
        existingProduct.quantity += quantity; // Update quantity
        existingProduct.expiryDate = expiryDate; // Update expiry date
        existingProduct.price = price; // Update price if necessary
    } else {
        // Add new product if no duplicate exists
        products.push({ name, price, quantity, expiryDate });
    }

    localStorage.setItem('products', JSON.stringify(products)); // Save to local storage
    updateProductTable();
    updateProductDropdown();
    checkAlerts();
}

// Add items to the bill
function addToBill() {
    let productName = document.getElementById('billingProductDropdown').value;
    let quantity = parseInt(document.getElementById('billingQuantity').value);

    let product = products.find(p => p.name === productName);
    if (!product || product.quantity < quantity) {
        alert("Product not found or insufficient stock.");
        return;
    }

    // Update bill and product inventory
    bill.push({ name: product.name, price: product.price, quantity });
    product.quantity -= quantity;
    localStorage.setItem('products', JSON.stringify(products)); // Save updated products

    updateProductTable();
    updateBill();
}

// Update the bill and calculate total
function updateBill() {
    let billList = document.getElementById('billList');
    billList.innerHTML = ''; // Clear current bill
    let total = 0;

    bill.forEach(item => {
        let listItem = document.createElement('li');
        listItem.textContent = `${item.name} - ${item.quantity} x ₹${item.price}`;
        billList.appendChild(listItem);

        total += item.price * item.quantity; // Calculate total cost
    });

    document.getElementById('totalAmount').textContent = total.toFixed(2);
}
// Display products in a table
function updateProductTable() {
    let tbody = document.getElementById('productTable').querySelector('tbody');
    tbody.innerHTML = ''; // Clear existing rows

    products.forEach(product => {
        let row = `<tr>
            <td>${product.name}</td>
            <td>${product.price}</td>
            <td>${product.quantity}</td>
            <td>${product.expiryDate}</td>
            <td><button onclick="deleteProduct('${product.name}')">Delete</button></td>
        </tr>`;
        tbody.innerHTML += row; // Add product rows to table
    });
}

// Delete a product from inventory
function deleteProduct(name) {
    // Remove the product with the matching name
    products = products.filter(product => product.name !== name);
    localStorage.setItem('products', JSON.stringify(products)); // Save updated inventory
    updateProductTable();
    updateProductDropdown();
    checkAlerts();
}
// Simple export to CSV file
function exportToExcel() {
    let csvContent = "Name,Price,Quantity,Expiry Date\n";
    products.forEach(product => {
        csvContent += `${product.name},${product.price},${product.quantity},${product.expiryDate}\n`;
    });

    let encodedUri = encodeURI("data:text/csv;charset=utf-8," + csvContent);
    let link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "inventory.csv");
    document.body.appendChild(link);
    link.click();
}
function generateInvoice() {
    const clientName = document.getElementById("clientName").value;
    const clientAddress = document.getElementById("clientAddress").value;
    const clientContact = document.getElementById("clientContact").value;

    if (!clientName || !clientAddress || !clientContact) {
        alert("Please fill in all client information fields.");
        return;
    }

    // Invoice Details
    const companyInfo = `
        <h2>StockSphere</h2>
        <p>Address: Dronacharya Group of institution</p>
        <p>Contact: 99xxxxxx09/ email@StockSphere.com</p>
    `;

    const clientInfo = `
        <h3>Client Information</h3>
        <p>Name: ${clientName}</p>
        <p>Address: ${clientAddress}</p>
        <p>Contact: ${clientContact}</p>
    `;

    const invoiceInfo = `
        <h3>Invoice Information</h3>
        <p>Invoice Number: INV-${Date.now()}</p>
        <p>Invoice Date: ${new Date().toLocaleDateString()}</p>
        <p>Due Date: ${new Date(new Date().setDate(new Date().getDate() + 30)).toLocaleDateString()}</p>
    `;

    // Itemized List
    let itemizedList = `
        <table>
            <thead>
                <tr>
                    <th>Product/Service</th>
                    <th>Quantity</th>
                    <th>Unit Price</th>
                    <th>Total Price</th>
                </tr>
            </thead>
            <tbody>
    `;

    let subtotal = 0;
    bill.forEach(item => {
        const totalPrice = item.quantity * item.price;
        subtotal += totalPrice;
        itemizedList += `
            <tr>
                <td>${item.name}</td>
                <td>${item.quantity}</td>
                <td>₹${item.price.toFixed(2)}</td>
                <td>₹${totalPrice.toFixed(2)}</td>
            </tr>
        `;
    });
    itemizedList += `</tbody></table>`;

    const tax = subtotal * 0.18; // 18% GST
    const total = subtotal + tax;

    const summary = `
        <p>Subtotal: ₹${subtotal.toFixed(2)}</p>
        <p>Taxes (18% GST): ₹${tax.toFixed(2)}</p>
        <h3>Total Amount Due: ₹${total.toFixed(2)}</h3>
    `;

    // Payment Instructions
    const paymentInstructions = `
        <h3>Payment Instructions</h3>
        <p>Bank Account: 1234567890</p>
        <p>IFSC: ABCD0123456</p>
        <p>Other Methods: PayPal - paypal@company.com</p>
    `;

    document.getElementById("invoiceContent").innerHTML = `
        ${companyInfo}
        ${clientInfo}
        ${invoiceInfo}
        ${itemizedList}
        ${summary}
        ${paymentInstructions}
    `;

    document.getElementById("invoiceSection").style.display = "block";
}
function printInvoice() {
    const invoiceContent = document.getElementById("invoiceContent").innerHTML;
    const printWindow = window.open("", "_blank");
    printWindow.document.write(`
        <html>
            <head>
                <title>Invoice</title>
            </head>
            <body>
                ${invoiceContent}
            </body>
        </html>
    `);
    printWindow.print();
    printWindow.close();
}
