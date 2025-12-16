// Get the API URL dynamically from the current page location
const API_URL = `${window.location.protocol}//${window.location.host}`;

let isEditing = false;
let currentViewDate = new Date(); // Track which date range we're viewing

// ========== Date filtering functions ==========
function formatDateForDisplay(dateStr) {
    const date = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
   
    // Reset time parts for comparison
    today.setHours(0, 0, 0, 0);
    tomorrow.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);
   
    if (date.getTime() === today.getTime()) {
        return 'Today';
    } else if (date.getTime() === tomorrow.getTime()) {
        return 'Tomorrow';
    } else {
        return date.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
        });
    }
}

function getDateRange() {
    const today = new Date();
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + 30); // Show next 7 days
   
    return {
        start: today.toISOString().split('T')[0],
        end: endDate.toISOString().split('T')[0]
    };
}

function loadSchedules() {
    if (isEditing) return;
   
    const dateRange = getDateRange();
   
    // Load modules and schedules with date filtering
    Promise.all([
        fetch(`${API_URL}/modules`).then(res => {
            if (!res.ok) throw new Error(`Modules API error: ${res.status}`);
            return res.json();
        }),
        fetch(`${API_URL}/schedules?start_date=${dateRange.start}&end_date=${dateRange.end}`).then(res => {
            if (!res.ok) throw new Error(`Schedules API error: ${res.status}`);
            return res.json();
        })
    ])
    .then(([modules, schedules]) => {
        const tbody = document.getElementById('schedulesTable');
        tbody.innerHTML = '';
       
        // Filter only active modules
        const activeModules = modules.filter(module =>
            module.status && module.status.toLowerCase() === 'active'
        );
       
        if (activeModules.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6">No active modules found. Please add modules first.</td></tr>';
            return;
        }
       
        // Group schedules by module
        const schedulesByModule = {};
       
        activeModules.forEach(module => {
            schedulesByModule[module.module_id] = [];
        });
       
        schedules.forEach(schedule => {
            if (schedulesByModule[schedule.module_id]) {
                schedulesByModule[schedule.module_id].push(schedule);
            }
        });
       
        // Create rows for each module and their schedules
        activeModules.forEach(module => {
            const moduleSchedules = schedulesByModule[module.module_id];
           
            if (moduleSchedules.length === 0) {
                // No schedules for this module - show empty row with "Add" option
                const row = tbody.insertRow();
                row.innerHTML = `
                    <td><strong>${module.module_id}</strong></td>
                    <td><em>No schedules</em></td>
                    <td><em>-</em></td>
                    <td><em>-</em></td>
                    <td><span class="status-badge status-pending">pending</span></td>
                    <td>
                        <button onclick="addNewSchedule('${module.module_id}')" class="btn-add">+ Add Schedule</button>
                    </td>
                `;
            } else {
                // Show all schedules for this module
                moduleSchedules.forEach((schedule, index) => {
                    const row = tbody.insertRow();
                   
                    // Show module name only on first row
                    const moduleCell = index === 0
                        ? `<strong>${module.module_id}</strong>`
                        : '<span style="color: #ccc;">↳</span>';
                   
                    row.innerHTML = `
                        <td>${moduleCell}</td>
                        <td>${formatDateForDisplay(schedule.feed_date)}<br><small style="color: #666;">${schedule.feed_date}</small></td>
                        <td>${formatTime(schedule.feed_time)}</td>
                        <td>${schedule.amount}g</td>
                        <td><span class="status-badge status-${schedule.status}">${schedule.status}</span></td>
                        <td>
                            <button onclick="editSchedule('${module.module_id}', '${schedule.feed_date}', '${schedule.feed_time}', ${schedule.amount}, '${schedule.status}', ${schedule.schedule_id})" class="btn-edit">Edit</button>
                            <button onclick="deleteSchedule(${schedule.schedule_id})" class="btn-delete">Delete</button>
                            ${index === 0 ? `<button onclick="addNewSchedule('${module.module_id}')" class="btn-add" style="margin-left: 5px;">+ Add</button>` : ''}
                        </td>
                    `;
                });
            }
        });
    })
    .catch(error => {
        console.error('Error loading data:', error);
        document.getElementById('schedulesTable').innerHTML =
            `<tr><td colspan="6">Error loading data: ${error.message}</td></tr>`;
    });
}

function formatTime(timeString) {
    if (!timeString) return 'Not set';
    try {
        const [hours, minutes] = timeString.split(':');
        const hour = parseInt(hours);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour % 12 || 12;
        return `${displayHour}:${minutes} ${ampm}`;
    } catch (e) {
        return timeString;
    }
}

// ========== ADD NEW SCHEDULE WITH CHECKBOX ==========
function addNewSchedule(moduleId) {
    isEditing = true;
    const tbody = document.getElementById('schedulesTable');
    const row = tbody.insertRow(0); // Insert at top
   
    const today = new Date().toISOString().split('T')[0];
   
    row.innerHTML = `
        <td><strong>${moduleId}</strong></td>
        <td colspan="2">
            <div style="padding: 10px; background: #f9f9f9; border-radius: 5px;">
                <label style="display: block; margin-bottom: 8px;"><strong>Create Schedule</strong></label>
                <div style="margin-bottom: 10px;">
                    <label style="display: block; margin-bottom: 5px; font-size: 0.9em;">Date:</label>
                    <input type="date" id="new_feed_date" value="${today}" class="input-date" required />
                </div>
                <div style="margin-bottom: 10px;">
                    <label style="display: block; margin-bottom: 5px; font-size: 0.9em;">Time:</label>
                    <input type="time" id="new_feed_time" value="15:00" class="input-time" required />
                </div>
                <div style="margin-top: 10px; padding: 8px; background: #fff; border-radius: 3px; border: 1px solid #ddd;">
                    <label style="display: flex; align-items: center; cursor: pointer;">
                        <input type="checkbox" id="repeat_daily_checkbox" style="margin-right: 8px; width: 16px; height: 16px; cursor: pointer;">
                        <span style="font-size: 0.9em;">
                            <strong>Repeat Daily (next 7 days)</strong><br>
                            <small style="color: #666;">Creates same schedule for the next 7 days</small>
                        </span>
                    </label>
                </div>
            </div>
        </td>
        <td><input type="number" id="new_amount" value="1000" step="0.01" min="0" class="input-amount" placeholder="grams" required /></td>
        <td><span class="status-badge status-pending">pending</span></td>
        <td>
            <button onclick="saveNewSchedule('${moduleId}')" class="btn-save">Save Schedule</button>
            <button onclick="cancelEdit()" class="btn-cancel">Cancel</button>
        </td>
    `;
   
    document.getElementById('new_feed_date').focus();
}

function saveNewSchedule(moduleId) {
    const feedDate = document.getElementById('new_feed_date').value;
    const feedTime = document.getElementById('new_feed_time').value;
    const amount = parseFloat(document.getElementById('new_amount').value);
    const isRecurring = document.getElementById('repeat_daily_checkbox').checked;
   
    if (!feedDate) {
        showNotification('Feed date is required', 'error');
        return;
    }
   
    if (!feedTime) {
        showNotification('Feed time is required', 'error');
        return;
    }
   
    if (isNaN(amount) || amount <= 0) {
        showNotification('Please enter a valid amount greater than 0', 'error');
        return;
    }
   
    if (isRecurring) {
        // ========== FIX: Send start_date with recurring schedules ==========
        const data = {
            module_id: moduleId,
            start_date: feedDate,  // Use the selected date as starting point
            feed_time: feedTime,
            amount: amount,
            days_ahead: 7
        };
       
        showNotification('Creating 7 recurring schedules...', 'info');
       
        fetch(`${API_URL}/schedules/recurring`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(data)
        })
        .then(res => {
            if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
            return res.json();
        })
        .then((result) => {
            showNotification(`✓ Created ${result.created_count} schedules for the next 7 days`, 'success');
            isEditing = false;
            loadSchedules();
        })
        .catch(error => {
            console.error('Error adding recurring schedule:', error);
            showNotification('Error adding recurring schedule: ' + error.message, 'error');
            isEditing = false;
        });
    } else {
        // Create single schedule
        const data = {
            module_id: moduleId,
            feed_date: feedDate,
            feed_time: feedTime,
            amount: amount,
            status: 'pending'
        };
       
        fetch(`${API_URL}/schedules`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(data)
        })
        .then(res => {
            if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
            return res.json();
        })
        .then(() => {
            showNotification('✓ Schedule created successfully', 'success');
            isEditing = false;
            loadSchedules();
        })
        .catch(error => {
            console.error('Error adding schedule:', error);
            showNotification('Error adding schedule: ' + error.message, 'error');
            isEditing = false;
        });
    }
}

// ========== EDIT EXISTING SCHEDULE ==========
function editSchedule(moduleId, feedDate, feedTime, amount, status, scheduleId) {
    isEditing = true;
    const row = event.target.closest('tr');
   
    row.innerHTML = `
        <td><strong>${moduleId}</strong></td>
        <td><input type="date" id="edit_feed_date" value="${feedDate}" class="input-date" required /></td>
        <td><input type="time" id="edit_feed_time" value="${feedTime}" class="input-time" required /></td>
        <td><input type="number" id="edit_amount" value="${amount}" step="0.01" min="0" class="input-amount" placeholder="grams" required /></td>
        <td><span class="status-badge status-${status}">${status}</span></td>
        <td>
            <button onclick="saveSchedule('${moduleId}', ${scheduleId})" class="btn-save">Save</button>
            <button onclick="cancelEdit()" class="btn-cancel">Cancel</button>
        </td>
    `;
   
    document.getElementById('edit_feed_date').focus();
}

function saveSchedule(moduleId, scheduleId) {
    const feedDate = document.getElementById('edit_feed_date').value;
    const feedTime = document.getElementById('edit_feed_time').value;
    const amount = parseFloat(document.getElementById('edit_amount').value);
   
    if (!feedDate) {
        showNotification('Feed date is required', 'error');
        return;
    }
   
    if (!feedTime) {
        showNotification('Feed time is required', 'error');
        return;
    }
   
    if (isNaN(amount) || amount <= 0) {
        showNotification('Please enter a valid amount greater than 0', 'error');
        return;
    }
   
    const data = {
        module_id: moduleId,
        feed_date: feedDate,
        feed_time: feedTime,
        amount: amount,
        status: 'pending'
    };
   
    fetch(`${API_URL}/schedules/${scheduleId}`, {
        method: 'PUT',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(data)
    })
    .then(res => {
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return res.json();
    })
    .then(() => {
        showNotification('Schedule updated successfully', 'success');
        isEditing = false;
        loadSchedules();
    })
    .catch(error => {
        console.error('Error updating schedule:', error);
        showNotification('Error updating schedule: ' + error.message, 'error');
        isEditing = false;
    });
}

function deleteSchedule(scheduleId) {
    if (!confirm('Are you sure you want to delete this schedule?')) {
        return;
    }
   
    fetch(`${API_URL}/schedules/${scheduleId}`, {
        method: 'DELETE'
    })
    .then(res => {
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return res.json();
    })
    .then(() => {
        showNotification('Schedule deleted successfully', 'success');
        loadSchedules();
    })
    .catch(error => {
        console.error('Error deleting schedule:', error);
        showNotification('Error deleting schedule: ' + error.message, 'error');
    });
}

function cancelEdit() {
    isEditing = false;
    loadSchedules();
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    const bgColor = type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : '#2196F3';
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${bgColor};
        color: white;
        padding: 15px 20px;
        border-radius: 5px;
        box-shadow: 0 2px 5px rgba(0,0,0,0.2);
        z-index: 1000;
        animation: slideIn 0.3s ease-out;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);
   
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Add CSS for styling
const style = document.createElement('style');
style.textContent = `
    .status-badge {
        padding: 4px 12px;
        border-radius: 12px;
        font-size: 0.85em;
        font-weight: 500;
    }
    .status-pending {
        background: #fff3cd;
        color: #856404;
    }
    .status-done {
        background: #d4edda;
        color: #155724;
    }
    .status-cancelled {
        background: #f8d7da;
        color: #721c24;
    }
    .btn-edit, .btn-add {
        background: #2196F3;
        color: white;
        border: none;
        padding: 6px 12px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 0.9em;
        margin-right: 5px;
    }
    .btn-edit:hover, .btn-add:hover {
        background: #1976D2;
    }
    .btn-save {
        background: #4CAF50;
        color: white;
        border: none;
        padding: 6px 12px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 0.9em;
        margin-right: 5px;
    }
    .btn-save:hover {
        background: #45a049;
    }
    .btn-cancel {
        background: #9E9E9E;
        color: white;
        border: none;
        padding: 6px 12px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 0.9em;
        margin-right: 5px;
    }
    .btn-cancel:hover {
        background: #757575;
    }
    .btn-delete {
        background: #f44336;
        color: white;
        border: none;
        padding: 6px 12px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 0.9em;
    }
    .btn-delete:hover {
        background: #d32f2f;
    }
    .input-time, .input-amount, .input-date {
        padding: 6px 10px;
        border: 1px solid #ddd;
        border-radius: 4px;
        font-size: 0.9em;
        width: 100%;
    }
    .input-time:focus, .input-amount:focus, .input-date:focus {
        outline: none;
        border-color: #2196F3;
    }
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);

// Load schedules on page load
loadSchedules();

// Auto-refresh every 10 seconds (when not editing)
setInterval(() => {
    if (!isEditing) {
        loadSchedules();
    }
}, 10000);