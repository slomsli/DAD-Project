// Runner dashboard functionality
document.addEventListener('DOMContentLoaded', function() {
    // Check authentication
    checkAuth();
    
    // Set up logout button
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }
    
    // Set up navigation
    setupNavigation();
    
    // Set up modal close buttons
    const closeButtons = document.querySelectorAll('.close');
    closeButtons.forEach(button => {
        button.addEventListener('click', function() {
            const modal = this.closest('.modal');
            modal.style.display = 'none';
        });
    });
    
    // Set up update status form
    const updateStatusForm = document.getElementById('update-status-form');
    if (updateStatusForm) {
        updateStatusForm.addEventListener('submit', function(e) {
            e.preventDefault();
            updateOrderStatus();
        });
    }
    
    // Load available orders initially
    loadAvailableOrders();
    
    // Set up polling for order updates
    setInterval(function() {
        const activeSection = document.querySelector('nav ul li a.active');
        if (activeSection) {
            const sectionId = activeSection.id;
            
            if (sectionId === 'available-nav') {
                loadAvailableOrders();
            } else if (sectionId === 'active-nav') {
                loadActiveDeliveries();
            } else if (sectionId === 'history-nav') {
                loadDeliveryHistory();
            }
        }
    }, 30000); // Poll every 30 seconds
});

// Check if user is authenticated
function checkAuth() {
    fetch('php/api.php?action=check_auth')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // User is logged in
                if (data.user.role !== 'runner') {
                    // Redirect to appropriate dashboard if not a runner
                    window.location.href = data.user.role + '.html';
                } else {
                    // Update user name and platform badge
                    document.getElementById('user-name').textContent = 'Welcome, ' + data.user.name;
                    
                    const platformBadge = document.getElementById('platform-badge');
                    platformBadge.textContent = data.user.platform.toUpperCase();
                    platformBadge.className = 'status-badge';
                    
                    if (data.user.platform === 'grab') {
                        platformBadge.classList.add('status-picked_up');
                    } else if (data.user.platform === 'foodpanda') {
                        platformBadge.classList.add('status-in_transit');
                    }
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

// Set up navigation
function setupNavigation() {
    const navLinks = {
        'available-nav': 'available-orders-section',
        'active-nav': 'active-deliveries-section',
        'history-nav': 'delivery-history-section'
    };
    
    for (const [navId, sectionId] of Object.entries(navLinks)) {
        const navLink = document.getElementById(navId);
        if (navLink) {
            navLink.addEventListener('click', function(e) {
                e.preventDefault();
                
                // Hide all sections
                Object.values(navLinks).forEach(id => {
                    const section = document.getElementById(id);
                    if (section) {
                        section.style.display = 'none';
                    }
                });
                
                // Show selected section
                const section = document.getElementById(sectionId);
                if (section) {
                    section.style.display = 'block';
                }
                
                // Update active nav link
                document.querySelectorAll('nav ul li a').forEach(link => {
                    link.classList.remove('active');
                });
                this.classList.add('active');
                
                // Load data for the selected section
                if (navId === 'available-nav') {
                    loadAvailableOrders();
                } else if (navId === 'active-nav') {
                    loadActiveDeliveries();
                } else if (navId === 'history-nav') {
                    loadDeliveryHistory();
                }
            });
        }
    }
}

// Load available orders
function loadAvailableOrders() {
    fetch('php/api.php?action=get_runner_orders&status=available')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                displayAvailableOrders(data.orders);
            }
        })
        .catch(error => {
            console.error('Error loading available orders:', error);
        });
}

// Display available orders
function displayAvailableOrders(orders) {
    const container = document.getElementById('available-orders-container');
    const noOrdersMessage = document.getElementById('no-available-orders');
    
    if (orders.length === 0) {
        container.innerHTML = '';
        noOrdersMessage.style.display = 'block';
        return;
    }
    
    noOrdersMessage.style.display = 'none';
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
                <div><strong>Customer:</strong> ${order.customer_name}</div>
                <div><strong>Address:</strong> ${order.delivery_address}</div>
                <div class="order-total">Total: RM ${parseFloat(order.total).toFixed(2)}</div>
                <div class="order-actions">
                    <button class="btn view-order-btn" data-id="${order.id}">View Details</button>
                    <button class="btn pickup-order-btn" data-id="${order.id}">Pick Up Order</button>
                </div>
            </div>
        `;
        
        container.appendChild(orderElement);
        
        // Add event listeners
        const viewBtn = orderElement.querySelector('.view-order-btn');
        const pickupBtn = orderElement.querySelector('.pickup-order-btn');
        
        viewBtn.addEventListener('click', function() {
            viewOrderDetails(this.dataset.id);
        });
        
        pickupBtn.addEventListener('click', function() {
            pickupOrder(this.dataset.id);
        });
    });
}

// Load active deliveries
function loadActiveDeliveries() {
    fetch('php/api.php?action=get_runner_orders&status=active')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                displayActiveDeliveries(data.orders);
            }
        })
        .catch(error => {
            console.error('Error loading active deliveries:', error);
        });
}

// Display active deliveries
function displayActiveDeliveries(orders) {
    const container = document.getElementById('active-deliveries-container');
    const noDeliveriesMessage = document.getElementById('no-active-deliveries');
    
    if (orders.length === 0) {
        container.innerHTML = '';
        noDeliveriesMessage.style.display = 'block';
        return;
    }
    
    noDeliveriesMessage.style.display = 'none';
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
                <div><strong>Customer:</strong> ${order.customer_name}</div>
                <div><strong>Phone:</strong> ${order.customer_phone}</div>
                <div><strong>Address:</strong> ${order.delivery_address}</div>
                <div class="order-total">Total: RM ${parseFloat(order.total).toFixed(2)}</div>
                <div class="order-actions">
                    <button class="btn view-order-btn" data-id="${order.id}">View Details</button>
                    ${getStatusUpdateButton(order)}
                </div>
            </div>
        `;
        
        container.appendChild(orderElement);
        
        // Add event listeners
        const viewBtn = orderElement.querySelector('.view-order-btn');
        viewBtn.addEventListener('click', function() {
            viewOrderDetails(this.dataset.id);
        });
        
        const updateBtn = orderElement.querySelector('.update-status-btn');
        if (updateBtn) {
            updateBtn.addEventListener('click', function() {
                openUpdateStatusModal(this.dataset.id, this.dataset.status);
            });
        }
    });
}

// Get status update button based on current status
function getStatusUpdateButton(order) {
    if (order.status === 'picked_up') {
        return `<button class="btn update-status-btn" data-id="${order.id}" data-status="in_transit">Start Delivery</button>`;
    } else if (order.status === 'in_transit') {
        return `<button class="btn update-status-btn" data-id="${order.id}" data-status="delivered">Complete Delivery</button>`;
    }
    return '';
}

// Load delivery history
function loadDeliveryHistory() {
    fetch('php/api.php?action=get_runner_orders&status=history')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                displayDeliveryHistory(data.orders);
            }
        })
        .catch(error => {
            console.error('Error loading delivery history:', error);
        });
}

// Display delivery history
function displayDeliveryHistory(orders) {
    const container = document.getElementById('delivery-history-container');
    
    if (orders.length === 0) {
        container.innerHTML = '<p>No delivery history found.</p>';
        return;
    }
    
    container.innerHTML = '';
    
    orders.forEach(order => {
        const orderElement = document.createElement('div');
        orderElement.className = 'order-card';
        
        const date = new Date(order.created_at);
        const formattedDate = date.toLocaleString();
        
        const updatedDate = new Date(order.updated_at);
        const formattedUpdatedDate = updatedDate.toLocaleString();
        
        orderElement.innerHTML = `
            <div class="order-header">
                <div>
                    <strong>Order #${order.id}</strong>
                    <div>Ordered: ${formattedDate}</div>
                    <div>Delivered: ${formattedUpdatedDate}</div>
                </div>
                <span class="status-badge status-${order.status}">${formatStatus(order.status)}</span>
            </div>
            <div class="order-body">
                <div><strong>Customer:</strong> ${order.customer_name}</div>
                <div><strong>Address:</strong> ${order.delivery_address}</div>
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
    const modal = document.getElementById('order-details-modal');
    const content = document.getElementById('order-details-content');
    const actionsDiv = document.getElementById('order-actions');
    
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
    
    content.innerHTML = `
        <div class="mb-3">
            <span class="status-badge status-${order.status}">${formatStatus(order.status)}</span>
            <div class="mt-2"><strong>Order Date:</strong> ${formattedDate}</div>
        </div>
        
        <div class="mb-3">
            <h3>Customer Information</h3>
            <div><strong>Name:</strong> ${order.customer_name}</div>
            <div><strong>Phone:</strong> ${order.customer_phone}</div>
            <div><strong>Address:</strong> ${order.delivery_address}</div>
            <div><strong>Payment Method:</strong> ${order.payment_method}</div>
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
    
    // Add action buttons based on order status
    actionsDiv.innerHTML = '';
    
    if (order.status === 'assigned' && !order.assigned_runner_id) {
        actionsDiv.innerHTML = `
            <button class="btn pickup-order-btn" data-id="${order.id}">Pick Up Order</button>
        `;
        
        // Add event listener
        const pickupBtn = actionsDiv.querySelector('.pickup-order-btn');
        pickupBtn.addEventListener('click', function() {
            pickupOrder(this.dataset.id);
            modal.style.display = 'none';
        });
    } else if (order.status === 'picked_up') {
        actionsDiv.innerHTML = `
            <button class="btn update-status-btn" data-id="${order.id}" data-status="in_transit">Start Delivery</button>
        `;
        
        // Add event listener
        const updateBtn = actionsDiv.querySelector('.update-status-btn');
        updateBtn.addEventListener('click', function() {
            openUpdateStatusModal(this.dataset.id, this.dataset.status);
            modal.style.display = 'none';
        });
    } else if (order.status === 'in_transit') {
        actionsDiv.innerHTML = `
            <button class="btn update-status-btn" data-id="${order.id}" data-status="delivered">Complete Delivery</button>
        `;
        
        // Add event listener
        const updateBtn = actionsDiv.querySelector('.update-status-btn');
        updateBtn.addEventListener('click', function() {
            openUpdateStatusModal(this.dataset.id, this.dataset.status);
            modal.style.display = 'none';
        });
    }
    
    modal.style.display = 'block';
}

// Pick up order
function pickupOrder(orderId) {
    const formData = new FormData();
    formData.append('action', 'pickup_order');
    formData.append('order_id', orderId);
    
    fetch('php/api.php', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert('Order picked up successfully!');
            
            // Reload orders
            loadAvailableOrders();
            loadActiveDeliveries();
            
            // Switch to active deliveries tab
            document.getElementById('active-nav').click();
        } else {
            alert('Failed to pick up order: ' + data.message);
        }
    })
    .catch(error => {
        console.error('Error picking up order:', error);
        alert('An error occurred. Please try again.');
    });
}

// Open update status modal
function openUpdateStatusModal(orderId, status) {
    const modal = document.getElementById('update-status-modal');
    const message = document.getElementById('status-confirmation-message');
    
    document.getElementById('update-order-id').value = orderId;
    document.getElementById('update-status').value = status;
    
    if (status === 'in_transit') {
        message.textContent = 'Are you sure you want to start delivery for this order?';
    } else if (status === 'delivered') {
        message.textContent = 'Are you sure you want to mark this order as delivered?';
    }
    
    modal.style.display = 'block';
}

// Update order status
function updateOrderStatus() {
    const orderId = document.getElementById('update-order-id').value;
    const status = document.getElementById('update-status').value;

    const formData = new FormData();
    formData.append('action', 'update_order_status_runner');
    formData.append('order_id', orderId);
    formData.append('status', status);

    fetch('php/api.php', {
        method: 'POST',
        body: formData
    })
    .then(async response => {
        if (!response.ok) {
            throw new Error('Server returned an error status.');
        }

        let data;
        try {
            data = await response.json();
        } catch (jsonError) {
            console.warn("No JSON response or malformed JSON:", jsonError);
            data = { success: true };  // Assume success if no JSON but status is 200
        }

        if (data.success) {
            alert(`Order status updated to ${formatStatus(status)}!`);

            // Close modal
            document.getElementById('update-status-modal').style.display = 'none';

            // Reload orders
            loadAvailableOrders();
            loadActiveDeliveries();
            loadDeliveryHistory();

            if (status === 'delivered') {
                document.getElementById('history-nav').click();
            }
        } else {
            alert('Failed to update order status: ' + (data.message || 'Unknown error.'));
        }
    })
    .catch(error => {
        console.error('Error updating order status:', error);
        alert('An error occurred. Please try again.');
    });
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
