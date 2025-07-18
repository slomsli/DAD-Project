// Staff dashboard functionality
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
    
    // Set up platform assignment form
    const platformAssignmentForm = document.getElementById('platform-assignment-form');
    if (platformAssignmentForm) {
        platformAssignmentForm.addEventListener('submit', function(e) {
            e.preventDefault();
            assignPlatform();
        });
    }
    
    // Set up menu item form
    const menuItemForm = document.getElementById('menu-item-form');
    if (menuItemForm) {
        menuItemForm.addEventListener('submit', function(e) {
            e.preventDefault();
            saveMenuItem();
        });
    }
    
    // Set up menu category filter
    const menuCategoryFilter = document.getElementById('menu-category-filter');
    if (menuCategoryFilter) {
        menuCategoryFilter.addEventListener('change', function() {
            loadMenuItems();
        });
    }
    
    // Set up order status filter
    const orderStatusFilter = document.getElementById('order-status-filter');
    if (orderStatusFilter) {
        orderStatusFilter.addEventListener('change', function() {
            loadAllOrders();
        });
    }
    
    // Load pending orders initially
    loadPendingOrders();
    
    // Set up polling for order updates
    setInterval(function() {
        const activeSection = document.querySelector('nav ul li a.active');
        if (activeSection) {
            const sectionId = activeSection.id;
            
            if (sectionId === 'pending-nav') {
                loadPendingOrders();
            } else if (sectionId === 'confirmed-nav') {
                loadConfirmedOrders();
            } else if (sectionId === 'all-orders-nav') {
                loadAllOrders();
            }
        }
    }, 30000); // Poll every 30 seconds
    
    // Set up add menu item button
    const addMenuItemBtn = document.getElementById('add-menu-item-btn');
    if (addMenuItemBtn) {
        // The button is commented out in HTML, but we keep this functionally disabled
        addMenuItemBtn.style.display = 'none'; 
    }
});

// Check if user is authenticated
function checkAuth() {
    fetch('php/api.php?action=check_auth')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // User is logged in
                if (data.user.role !== 'staff') {
                    // Redirect to appropriate dashboard if not staff
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

// Set up navigation
function setupNavigation() {
    const navLinks = {
        'pending-nav': 'pending-orders-section',
        'confirmed-nav': 'confirmed-orders-section',
        'all-orders-nav': 'all-orders-section',
        'menu-management-nav': 'menu-management-section'
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
                if (navId === 'pending-nav') {
                    loadPendingOrders();
                } else if (navId === 'confirmed-nav') {
                    loadConfirmedOrders();
                } else if (navId === 'all-orders-nav') {
                    loadAllOrders();
                } else if (navId === 'menu-management-nav') {
                    loadMenuItems();
                }
            });
        }
    }
}

// Load pending orders
function loadPendingOrders() {
    fetch('php/api.php?action=get_staff_orders&status=pending')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                displayOrders(data.orders, 'pending-orders-container', true);
            }
        })
        .catch(error => {
            console.error('Error loading pending orders:', error);
        });
}

// Load confirmed orders
function loadConfirmedOrders() {
    fetch('php/api.php?action=get_staff_orders&status=confirmed')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                displayOrders(data.orders, 'confirmed-orders-container', true);
            }
        })
        .catch(error => {
            console.error('Error loading confirmed orders:', error);
        });
}

// Load all orders
function loadAllOrders() {
    const status = document.getElementById('order-status-filter').value;
    const url = status === 'all' 
        ? 'php/api.php?action=get_staff_orders' 
        : `php/api.php?action=get_staff_orders&status=${status}`;
    
    fetch(url)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                displayOrders(data.orders, 'all-orders-container', false);
            }
        })
        .catch(error => {
            console.error('Error loading all orders:', error);
        });
}

// Display orders
function displayOrders(orders, containerId, showActions) {
    const container = document.getElementById(containerId);
    
    if (orders.length === 0) {
        container.innerHTML = '<p>No orders found.</p>';
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
                <div><strong>Customer:</strong> ${order.customer_name}</div>
                <div><strong>Phone:</strong> ${order.customer_phone}</div>
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
            viewOrderDetails(this.dataset.id, showActions);
        });
    });
}

// View order details
function viewOrderDetails(orderId, showActions) {
    fetch(`php/api.php?action=get_order_details&order_id=${orderId}`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                displayOrderDetails(data.order, data.items, showActions);
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
function displayOrderDetails(order, items, showActions) {
    const modal = document.getElementById('order-details-modal');
    const content = document.getElementById('order-details-content');
    const actionsContainer = document.getElementById('order-actions');

    // Clear previous content and actions
    content.innerHTML = '';
    actionsContainer.innerHTML = '';

    // Populate order details (assuming this part of your function is already working)
    let itemsHtml = items.map(item => `
        <div>${item.name} (x${item.quantity}) - RM ${(item.price * item.quantity).toFixed(2)}</div>
    `).join('');

    content.innerHTML = `
        <p><strong>Order ID:</strong> ${order.id}</p>
        <p><strong>Customer:</strong> ${order.customer_name} (${order.customer_phone})</p>
        <p><strong>Address:</strong> ${order.delivery_address}</p>
        <p><strong>Total:</strong> RM ${parseFloat(order.total).toFixed(2)}</p>
        <p><strong>Payment Method:</strong> ${order.payment_method}</p>
        <p><strong>Status:</strong> <span class="status-badge status-${order.status}">${formatStatus(order.status)}</span></p>
        <p><strong>Platform:</strong> ${order.assigned_platform || 'Not Assigned'}</p>
        <p><strong>Runner:</strong> ${order.assigned_runner_name || 'Not Assigned'}</p>
        <div><strong>Items:</strong>${itemsHtml}</div>
    `;

    // Add action buttons
    if (showActions) { // showActions might be true for pending/confirmed views
        if (order.status === 'pending') {
            const confirmAssignBtn = document.createElement('button');
            confirmAssignBtn.className = 'btn btn-success mr-2'; // Added mr-2 for spacing if other buttons exist
            confirmAssignBtn.textContent = 'Confirm & Assign Platform';
            confirmAssignBtn.onclick = function() {
                openPlatformAssignmentModal(order.id);
                // Optionally close this modal, or leave it. For now, let's assume platform modal takes focus.
                // modal.style.display = 'none'; 
            };
            actionsContainer.appendChild(confirmAssignBtn);

            const cancelBtn = document.createElement('button');
            cancelBtn.className = 'btn btn-danger';
            cancelBtn.textContent = 'Cancel Order';
            cancelBtn.onclick = function() {
                updateOrderStatus(order.id, 'cancelled');
                modal.style.display = 'none'; // Close details modal
            };
            actionsContainer.appendChild(cancelBtn);

        } else if (order.status === 'confirmed') {
            // If already confirmed, perhaps a button to re-assign or cancel (if rules allow)
            // For now, let's assume no direct action from here once confirmed, runner takes over.
            // Or maybe a "Mark as Preparing" or similar if that's a status
            const cancelBtn = document.createElement('button');
            cancelBtn.className = 'btn btn-danger';
            cancelBtn.textContent = 'Cancel Order (if not picked up)';
            cancelBtn.onclick = function() {
                // Add a confirmation step before cancelling
                if(confirm("Are you sure you want to cancel this confirmed order? This should only be done if not yet picked up by a runner.")){
                    updateOrderStatus(order.id, 'cancelled');
                    modal.style.display = 'none'; // Close details modal
                }
            };
            actionsContainer.appendChild(cancelBtn);
        }
        // Add other status-dependent buttons as needed
    }

    modal.style.display = 'flex';
}

// Update order status
function updateOrderStatus(orderId, status) {
    const formData = new FormData();
    formData.append('action', 'update_order_status_staff'); // This is the existing general staff update action
    formData.append('order_id', orderId);
    formData.append('status', status);

    fetch('php/api.php', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert(`Order status updated to ${status} successfully!`);
            // Refresh relevant order lists
            loadPendingOrders();
            loadConfirmedOrders();
            loadAllOrders();
            // Close any open modals, like order details, if an action was taken from there
            const orderDetailsModal = document.getElementById('order-details-modal');
            if (orderDetailsModal && orderDetailsModal.style.display === 'flex') {
                 orderDetailsModal.style.display = 'none';
            }
        } else {
            alert('Failed to update order status: ' + (data.message || 'Unknown error'));
        }
    })
    .catch(error => {
        console.error('Error updating order status:', error);
        alert('An error occurred while updating order status.');
    });
}

// Open platform assignment modal
function openPlatformAssignmentModal(orderId) {
    document.getElementById('assignment-order-id').value = orderId;
    // Clear previously selected platform if any (optional, good practice)
    const platformRadios = document.getElementsByName('platform');
    if (platformRadios.length > 0) {
        platformRadios[0].checked = true; // Default to first option (e.g., Grab)
    }
    document.getElementById('platform-assignment-modal').style.display = 'flex';
}

// Assign order to platform
function assignPlatform() {
    const orderId = document.getElementById('assignment-order-id').value;
    const platform = document.querySelector('input[name="platform"]:checked').value;
    const errorDiv = null; // If you have an error div in this modal, assign it here.

    const formData = new FormData();
    formData.append('action', 'confirm_and_assign_platform'); // New Action
    formData.append('order_id', orderId);
    formData.append('platform', platform);
    formData.append('status', 'confirmed'); // New status being set

    fetch('php/api.php', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert('Order confirmed and assigned to platform successfully!');
            document.getElementById('platform-assignment-modal').style.display = 'none';
            const orderDetailsModal = document.getElementById('order-details-modal');
            if (orderDetailsModal) {
                orderDetailsModal.style.display = 'none';
            }
            loadPendingOrders();
            loadConfirmedOrders(); 
            loadAllOrders();
        } else {
            alert('Failed to assign platform: ' + (data.message || 'Unknown error'));
            if (errorDiv) {
                errorDiv.textContent = data.message || 'An unknown error occurred.';
                errorDiv.style.display = 'block';
            }
        }
    })
    .catch(error => {
        console.error('Error assigning platform:', error);
        alert('An error occurred while assigning platform. Please try again.');
        if (errorDiv) {
            errorDiv.textContent = 'An error occurred. Please check console and try again.';
            errorDiv.style.display = 'block';
        }
    });
}

// Load menu items
function loadMenuItems() {
    const category = document.getElementById('menu-category-filter').value;
    const url = category === 'all' 
        ? 'php/api.php?action=get_all_items' 
        : `php/api.php?action=get_all_items&category=${category}`;
    
    fetch(url)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                displayMenuItems(data.menu_items);
            }
        })
        .catch(error => {
            console.error('Error loading menu items:', error);
        });
}

// Display menu items
function displayMenuItems(items) {
    const tableBody = document.getElementById('menu-items-table');
    
    if (items.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="6">No items found.</td></tr>';
        return;
    }
    
    // Sort items by ID in ascending order
    items.sort((a, b) => parseInt(a.id) - parseInt(b.id));
    
    tableBody.innerHTML = '';
    
    items.forEach(item => {
        const row = document.createElement('tr');
        
        row.innerHTML = `
            <td>${item.id}</td>
            <td>${item.name}</td>
            <td>${parseFloat(item.price).toFixed(2)}</td>
            <td>${item.category}</td>
            <td>${item.is_available == 1 ? 'Yes' : 'No'}</td>
            <td>
                <button class="btn edit-item-btn" data-id="${item.id}">Edit</button>
                <button class="btn toggle-availability-btn" data-id="${item.id}" data-available="${item.is_available}">
                    ${item.is_available == 1 ? 'Mark Unavailable' : 'Mark Available'}
                </button>
            </td>
        `;
        
        tableBody.appendChild(row);
        
        // Add event listeners
        const editBtn = row.querySelector('.edit-item-btn');
        const toggleBtn = row.querySelector('.toggle-availability-btn');
        
        editBtn.addEventListener('click', function() {
            editMenuItem(this.dataset.id);
        });
        
        toggleBtn.addEventListener('click', function() {
            toggleAvailability(this.dataset.id, this.dataset.available);
        });
    });
}

// This function is no longer called to open the modal for adding, 
// but the modal itself is still used for editing.
function openMenuItemModal() {
    // This function is now effectively disabled.
    // The modal is opened via editMenuItem().
}

// Edit menu item
function editMenuItem(itemId) {
    fetch(`php/api.php?action=get_item&id=${itemId}`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const item = data.menu_item;
                const modal = document.getElementById('menu-item-modal');
                const title = document.getElementById('menu-modal-title');
                
                title.textContent = 'Edit Menu Item';
                
                document.getElementById('menu-item-id').value = item.id;
                document.getElementById('menu-item-name').value = item.name;
                document.getElementById('menu-item-price').value = item.price;
                document.getElementById('menu-item-category').value = item.category;
                document.getElementById('menu-item-image').value = item.image_url || '';
                
                if (item.is_available == 1) {
                    document.getElementById('menu-item-available').checked = true;
                } else {
                    document.getElementById('menu-item-unavailable').checked = true;
                }
                
                modal.style.display = 'flex'; // Use flex to be consistent with other modals
            } else {
                alert('Failed to load menu item: ' + data.message);
            }
        })
        .catch(error => {
            console.error('Error loading menu item:', error);
            alert('An error occurred. Please try again.');
        });
}

// Save menu item (add or update)
function saveMenuItem() {
    const itemId = document.getElementById('menu-item-id').value;
    const name = document.getElementById('menu-item-name').value;
    const price = document.getElementById('menu-item-price').value;
    const category = document.getElementById('menu-item-category').value;
    const imageUrl = document.getElementById('menu-item-image').value;
    const isAvailable = document.querySelector('input[name="is_available"]:checked').value;
    
    const formData = new FormData();
    formData.append('name', name);
    formData.append('price', price);
    formData.append('category', category);
    formData.append('image_url', imageUrl);
    formData.append('is_available', isAvailable);
    
    if (itemId) {
        // Update existing item
        formData.append('action', 'update_item');
        formData.append('id', itemId);
    } else {
        // Add new item
        formData.append('action', 'add_item');
    }
    
    fetch('php/api.php', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert(itemId ? 'Menu item updated successfully!' : 'Menu item added successfully!');
            
            // Close modal
            document.getElementById('menu-item-modal').style.display = 'none';
            
            // Reload menu items
            loadMenuItems();
        } else {
            alert('Failed to save menu item: ' + data.message);
        }
    })
    .catch(error => {
        console.error('Error saving menu item:', error);
        alert('An error occurred. Please try again.');
    });
}

// Toggle menu item availability
function toggleAvailability(itemId, currentAvailability) {
    const newAvailability = currentAvailability == 1 ? 0 : 1;
    
    const formData = new FormData();
    formData.append('action', 'toggle_availability');
    formData.append('id', itemId);
    formData.append('is_available', newAvailability);
    
    fetch('php/api.php', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert('Menu item availability updated successfully!');
            
            // Reload menu items
            loadMenuItems();
        } else {
            alert('Failed to update availability: ' + data.message);
        }
    })
    .catch(error => {
        console.error('Error updating availability:', error);
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
