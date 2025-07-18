// Customer dashboard functionality
let cart = [];
let currentCategory = 'all';
let menuItems = [];

// Logout function
function logout() {
    fetch('php/api.php', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'action=logout'
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                console.log('Logout successful');
            } else {
                console.warn('Logout failed on server:', data.message);
            }
            // Redirect to login page regardless of API response for logout
            window.location.href = 'index.html';
        })
        .catch(error => {
            console.error('Logout fetch error:', error);
            // Still redirect, as the user wants to logout
            window.location.href = 'index.html';
        });
}

document.addEventListener('DOMContentLoaded', function() {
    // Check authentication
    checkAuth();
    
    // Set up logout button
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }
    
    // Set up navigation
    const menuNav = document.getElementById('menu-nav');
    const ordersNav = document.getElementById('orders-nav');
    
    if (menuNav) {
        menuNav.addEventListener('click', function(e) {
            e.preventDefault();
            showSection('menu-section');
            this.classList.add('active');
            ordersNav.classList.remove('active');
        });
    }
    
    if (ordersNav) {
        ordersNav.addEventListener('click', function(e) {
            e.preventDefault();
            showSection('orders-section');
            loadCustomerOrders();
            this.classList.add('active');
            menuNav.classList.remove('active');
        });
    }
    
    // Set up category filtering
    const categoryItems = document.querySelectorAll('.category-item');
    categoryItems.forEach(item => {
        item.addEventListener('click', function() {
            currentCategory = this.dataset.category;
            categoryItems.forEach(cat => cat.classList.remove('active'));
            this.classList.add('active');
            filterMenuItems();
        });
    });
    
    // Set up checkout button
    const checkoutBtn = document.getElementById('checkout-btn');
    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', openCheckoutModal);
    }
    
    // Set up modal close buttons
    const closeButtons = document.querySelectorAll('.close');
    closeButtons.forEach(button => {
        button.addEventListener('click', function() {
            const modal = this.closest('.modal');
            modal.style.display = 'none';
        });
    });
    
    // Set up checkout form submission
    const checkoutForm = document.getElementById('checkout-form');
    if (checkoutForm) {
        checkoutForm.addEventListener('submit', function(e) {
            e.preventDefault();
            placeOrder();
        });
    }
    
    // Load menu items
    loadMenuItems();
    
    // Set up polling for order updates
    setInterval(function() {
        if (document.getElementById('orders-section').style.display === 'flex') {
            loadCustomerOrders();
        }
    }, 30000); // Poll every 30 seconds

    // --- New: Set up polling for menu updates ---
    setInterval(function() {
        // Only poll if the menu section is visible to save resources
        const menuSection = document.getElementById('menu-section');
        if (menuSection && menuSection.style.display !== 'none') {
            loadMenuItems();
        }
    }, 60000); // Poll every 60 seconds

    // --- New: Set up Floating View Cart Button ---
    const viewCartBtn = document.getElementById('view-cart-btn');
    const cartContainerForScroll = document.querySelector('.cart-container'); // Get the actual cart container

    if (viewCartBtn && cartContainerForScroll) {
        viewCartBtn.addEventListener('click', function() {
            cartContainerForScroll.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    }
    // --- End New Code ---
});

// Check if user is authenticated
function checkAuth() {
    fetch('php/api.php?action=check_auth')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // User is logged in
                if (data.user.role !== 'customer') {
                    // Redirect to appropriate dashboard if not a customer
                    window.location.href = data.user.role + '.html';
                } else {
                    // Update user name
                    document.getElementById('user-name').textContent = 'Welcome, ' + data.user.name;
                }
            } else {
                // Not logged in, redirect to login page
                window.location.href = 'index.html';
            }
        })
        .catch(error => {
            console.error('Error checking auth:', error);
        });
}

// Show/hide sections
function showSection(sectionId) {
    const sections = ['menu-section', 'orders-section'];
    sections.forEach(id => {
        const section = document.getElementById(id);
        if (section) {
            section.style.display = id === sectionId ? 'block' : 'none';
        }
    });
}

// Load menu items from API
function loadMenuItems() {
    fetch('php/api.php?action=get_all_items')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                menuItems = data.menu_items;
                filterMenuItems();
            }
        })
        .catch(error => {
            console.error('Error loading menu items:', error);
        });
}

// Filter menu items by category
function filterMenuItems() {
    const container = document.getElementById('menu-items-container');
    container.innerHTML = '';
    
    const filteredItems = currentCategory === 'all' 
        ? menuItems 
        : menuItems.filter(item => item.category === currentCategory);
    
    if (filteredItems.length === 0) {
        container.innerHTML = '<p>No items found in this category.</p>';
        return;
    }
    
    filteredItems.forEach(item => {
        const menuItemElement = createMenuItemElement(item);
        container.appendChild(menuItemElement);
    });
}

// Create menu item element
// ── customer.js ───────────────────────────────────────────────
function createMenuItemElement(item) {
    const menuItem = document.createElement('div');
    menuItem.className = 'menu-item';

    const imageUrl    = item.image_url || 'images/menu/default.jpg';
    const isAvailable = item.is_available == 1;

    if (!isAvailable) menuItem.classList.add('unavailable');

    /* ----- HTML template ----- */
    menuItem.innerHTML = `
        <div class="menu-item-image">
            <img src="${imageUrl}" alt="${item.name}">
            ${!isAvailable ? '<span class="unavailable-badge">Sold&nbsp;Out</span>' : ''}
        </div>

        <div class="menu-item-body">
            <h3 class="menu-item-title">${item.name}</h3>
            <p class="menu-item-price">RM ${parseFloat(item.price).toFixed(2)}</p>

            <div class="menu-item-actions">
                <button class="btn add-to-cart-btn"
                        data-id="${item.id}"
                        data-name="${item.name}"
                        data-price="${item.price}"
                        ${!isAvailable ? 'disabled' : ''}>
                    ${isAvailable ? 'Add to Cart' : 'Unavailable'}
                </button>
            </div>
        </div>
    `;
    /* ------------------------- */

    /* cart handler (unchanged) */
    if (isAvailable) {
        menuItem.querySelector('.add-to-cart-btn')
                .addEventListener('click', function () {
            addToCart({
                id:       this.dataset.id,
                name:     this.dataset.name,
                price:    parseFloat(this.dataset.price),
                quantity: 1
            });
        });
    }

    return menuItem;
}


// Add item to cart
function addToCart(item) {
    // Check if item already exists in cart
    const existingItem = cart.find(cartItem => cartItem.id === item.id);
    
    if (existingItem) {
        // Increment quantity
        existingItem.quantity++;
    } else {
        // Add new item
        cart.push(item);
    }
    
    // Update cart display
    updateCartDisplay();
}

// Update cart display
function updateCartDisplay() {
    const cartItemsContainer = document.getElementById('cart-items-container');
    const emptyCartMessage = document.getElementById('empty-cart-message');
    const cartSummary = document.getElementById('cart-summary');
    const floatCartCountSpan = document.getElementById('float-cart-count'); // Get the span in the floating button

    let totalItemsInCart = 0;
    cart.forEach(item => {
        totalItemsInCart += item.quantity;
    });

    if (floatCartCountSpan) {
        floatCartCountSpan.textContent = totalItemsInCart;
    }
    
    if (cart.length === 0) {
        cartItemsContainer.innerHTML = '';
        emptyCartMessage.style.display = 'block';
        cartSummary.style.display = 'none';
        return;
    }
    
    emptyCartMessage.style.display = 'none';
    cartSummary.style.display = 'block';
    
    cartItemsContainer.innerHTML = '';
    
    let subtotal = 0;
    
    cart.forEach((item, index) => {
        const itemTotal = item.price * item.quantity;
        subtotal += itemTotal;
        
        const cartItemElement = document.createElement('div');
        cartItemElement.className = 'cart-item';
        cartItemElement.innerHTML = `
            <div class="cart-item-info">
                <div class="cart-item-title">${item.name}</div>
                <div class="cart-item-price">RM ${item.price.toFixed(2)} x ${item.quantity}</div>
            </div>
            <div class="cart-item-quantity">
                <button class="quantity-btn decrease-btn" data-index="${index}">-</button>
                <span class="quantity-input">${item.quantity}</span>
                <button class="quantity-btn increase-btn" data-index="${index}">+</button>
                <button class="btn remove-btn" data-index="${index}">Remove</button>
            </div>
        `;
        
        cartItemsContainer.appendChild(cartItemElement);
        
        // Add event listeners for quantity buttons
        const decreaseBtn = cartItemElement.querySelector('.decrease-btn');
        const increaseBtn = cartItemElement.querySelector('.increase-btn');
        const removeBtn = cartItemElement.querySelector('.remove-btn');
        
        decreaseBtn.addEventListener('click', function() {
            decreaseQuantity(parseInt(this.dataset.index));
        });
        
        increaseBtn.addEventListener('click', function() {
            increaseQuantity(parseInt(this.dataset.index));
        });
        
        removeBtn.addEventListener('click', function() {
            removeFromCart(parseInt(this.dataset.index));
        });
    });
    
    // Update subtotal and total
    const deliveryFee = 5.00;
    const total = subtotal + deliveryFee;
    
    document.getElementById('cart-subtotal').textContent = `RM ${subtotal.toFixed(2)}`;
    document.getElementById('cart-total').textContent = `RM ${total.toFixed(2)}`;
}

// Decrease item quantity
function decreaseQuantity(index) {
    if (cart[index].quantity > 1) {
        cart[index].quantity--;
        updateCartDisplay();
    } else {
        removeFromCart(index);
    }
}

// Increase item quantity
function increaseQuantity(index) {
    cart[index].quantity++;
    updateCartDisplay();
}

// Remove item from cart
function removeFromCart(index) {
    cart.splice(index, 1);
    updateCartDisplay();
}

// Open checkout modal
function openCheckoutModal() {
    if (cart.length === 0) {
        alert('Your cart is empty. Please add items before checkout.');
        return;
    }
    
    const checkoutModal = document.getElementById('checkout-modal');
    const checkoutItems = document.getElementById('checkout-items');
    
    checkoutItems.innerHTML = '';
    
    let subtotal = 0;
    
    cart.forEach(item => {
        const itemTotal = item.price * item.quantity;
        subtotal += itemTotal;
        
        const itemElement = document.createElement('div');
        itemElement.className = 'cart-item';
        itemElement.innerHTML = `
            <div class="cart-item-info">
                <div class="cart-item-title">${item.name}</div>
                <div class="cart-item-price">RM ${item.price.toFixed(2)} x ${item.quantity}</div>
            </div>
            <div class="cart-item-total">RM ${itemTotal.toFixed(2)}</div>
        `;
        
        checkoutItems.appendChild(itemElement);
    });
    
    // Update subtotal and total
    const deliveryFee = 5.00;
    const total = subtotal + deliveryFee;
    
    document.getElementById('checkout-subtotal').textContent = `RM ${subtotal.toFixed(2)}`;
    document.getElementById('checkout-total').textContent = `RM ${total.toFixed(2)}`;
    
    checkoutModal.style.display = 'flex';
}

// Place order
function placeOrder() {
    const deliveryAddress = document.getElementById('delivery-address').value;
    const paymentMethod = document.querySelector('input[name="payment_method"]:checked').value;
    
    if (!deliveryAddress) {
        alert('Please enter a delivery address.');
        return;
    }
    
    // Calculate totals
    let subtotal = 0;
    cart.forEach(item => {
        subtotal += item.price * item.quantity;
    });
    
    const deliveryFee = 5.00;
    const total = subtotal + deliveryFee;
    
    // Create form data
    const formData = new FormData();
    formData.append('action', 'create_order');
    formData.append('phone', ''); // This would normally come from user profile
    formData.append('delivery_address', deliveryAddress);
    formData.append('payment_method', paymentMethod);
    formData.append('subtotal', subtotal);
    formData.append('delivery_fee', deliveryFee);
    formData.append('total', total);
    formData.append('items', JSON.stringify(cart));
    
    // Send order request
    fetch('php/api.php', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Order placed successfully
            alert('Order placed successfully!');
            
            // Clear cart
            cart = [];
            updateCartDisplay();
            
            // Close modal
            document.getElementById('checkout-modal').style.display = 'none';
            
            // Switch to orders tab
            document.getElementById('orders-nav').click();
        } else {
            alert('Failed to place order: ' + data.message);
        }
    })
    .catch(error => {
        console.error('Error placing order:', error);
        alert('An error occurred. Please try again.');
    });
}

// Load customer orders
function loadCustomerOrders() {
    fetch('php/api.php?action=get_customer_orders')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                displayOrders(data.orders);
            }
        })
        .catch(error => {
            console.error('Error loading orders:', error);
        });
}

// Display orders
function displayOrders(orders) {
    const container = document.getElementById('order-list-container');
    
    if (orders.length === 0) {
        container.innerHTML = '<p>You have no orders yet.</p>';
        return;
    }
    
    container.innerHTML = '';
    
    orders.forEach(order => {
        const orderElement = document.createElement('div');
        orderElement.className = 'order-card';
        
        const date = new Date(order.created_at);
        const formattedDate = date.toLocaleString();
        
        orderElement.innerHTML = `
            <div class="order-header">
                <div>
                    <strong>Order #${order.id}</strong>
                    <div>${formattedDate}</div>
                </div>
                <span class="status-badge status-${order.status}">${formatStatus(order.status)}</span>
            </div>
            <div class="order-body">
                <div class="order-total">Total: RM ${parseFloat(order.total).toFixed(2)}</div>
                <div class="order-actions">
                    <button class="btn view-order-btn" data-id="${order.id}">View Details</button>
                </div>
            </div>
        `;
        
        container.appendChild(orderElement);
        
        // Add event listener to view details button
        const viewBtn = orderElement.querySelector('.view-order-btn');
        viewBtn.addEventListener('click', function() {
            viewOrderDetails(this.dataset.id);
        });
    });
}

// View order details
function viewOrderDetails(orderId) {
    fetch(`php/api.php?action=get_order_details&order_id=${orderId}`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                displayOrderDetails(data.order, data.items);
            } else {
                alert('Failed to load order details: ' + data.message);
            }
        })
        .catch(error => {
            console.error('Error loading order details:', error);
            alert('An error occurred. Please try again.');
        });
}

// Display order details
function displayOrderDetails(order, items) {
    const orderDetailsModal = document.getElementById('order-details-modal');
    const orderDetailsContent = document.getElementById('order-details-content');
    
    const date = new Date(order.created_at);
    const formattedDate = date.toLocaleString();
    
    let itemsHtml = '';
    items.forEach(item => {
        itemsHtml += `
            <div class="order-item">
                <span>${item.name} x ${item.quantity}</span>
                <span>RM ${parseFloat(item.price).toFixed(2)}</span>
            </div>
        `;
    });
    
    let runnerInfo = '';
    if (order.assigned_runner_name) {
        runnerInfo = `
            <div class="mb-2">
                <strong>Runner:</strong> ${order.assigned_runner_name}
            </div>
        `;
    }
    
    let platformInfo = '';
    if (order.assigned_platform) {
        platformInfo = `
            <div class="mb-2">
                <strong>Platform:</strong> ${order.assigned_platform.toUpperCase()}
            </div>
        `;
    }
    
    orderDetailsContent.innerHTML = `
        <div class="mb-3">
            <span class="status-badge status-${order.status}">${formatStatus(order.status)}</span>
            <div class="mt-2"><strong>Order Date:</strong> ${formattedDate}</div>
        </div>
        
        <div class="mb-3">
            <h3>Delivery Information</h3>
            <div><strong>Address:</strong> ${order.delivery_address}</div>
            <div><strong>Payment Method:</strong> ${order.payment_method}</div>
            ${platformInfo}
            ${runnerInfo}
        </div>
        
        <div class="mb-3">
            <h3>Order Items</h3>
            <div class="order-items">
                ${itemsHtml}
            </div>
            <div class="order-total">
                <div>Subtotal: RM ${parseFloat(order.subtotal).toFixed(2)}</div>
                <div>Delivery Fee: RM ${parseFloat(order.delivery_fee).toFixed(2)}</div>
                <div><strong>Total: RM ${parseFloat(order.total).toFixed(2)}</strong></div>
            </div>
        </div>
    `;
    
    if (orderDetailsModal) {
        orderDetailsModal.style.display = 'flex';
    }
}

// Format status for display
function formatStatus(status) {
    switch (status) {
        case 'pending':
            return 'Pending';
        case 'confirmed':
            return 'Confirmed';
        case 'assigned':
            return 'Assigned';
        case 'picked_up':
            return 'Picked Up';
        case 'in_transit':
            return 'In Transit';
        case 'delivered':
            return 'Delivered';
        case 'cancelled':
            return 'Cancelled';
        default:
            return status;
    }
}
