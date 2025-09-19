/**
 * SimplifiAccess Neo - Component System
 * Reusable UI components with modern patterns
 */

// Card Component
class CardComponent extends NeoComponent {
    constructor(element, props = {}) {
        super(element, props);
        this.state = {
            loading: false,
            error: null,
            data: null
        };
    }

    async render() {
        const { title, subtitle, actions, children, className = '' } = this.props;
        
        this.element.className = `card ${className}`;
        this.element.innerHTML = `
            <div class="card-header">
                <div class="card-title">
                    ${title ? `<h3>${title}</h3>` : ''}
                    ${subtitle ? `<p>${subtitle}</p>` : ''}
                </div>
                <div class="card-actions">
                    ${actions ? actions.map(action => `
                        <button class="btn-icon" data-action="${action.id}">
                            <i class="${action.icon}"></i>
                        </button>
                    `).join('') : ''}
                </div>
            </div>
            <div class="card-content">
                ${children || ''}
            </div>
        `;

        // Add event listeners for actions
        if (actions) {
            actions.forEach(action => {
                const button = this.querySelector(`[data-action="${action.id}"]`);
                if (button) {
                    this.addEventListener('click', (e) => {
                        if (e.target.closest(`[data-action="${action.id}"]`)) {
                            action.handler();
                        }
                    });
                }
            });
        }
    }
}

// Door Card Component
class DoorCardComponent extends NeoComponent {
    constructor(element, props = {}) {
        super(element, props);
        this.state = {
            door: props.door || {},
            loading: false,
            error: null
        };
    }

    async render() {
        const { door } = this.state;
        const isOnline = door.is_online;
        const lastSeen = door.last_seen ? Utils.formatRelativeTime(door.last_seen) : 'Never';
        
        this.element.className = `door-card ${isOnline ? 'online' : 'offline'}`;
        this.element.innerHTML = `
            <div class="door-header">
                <div class="door-name">${door.name || 'Unknown Door'}</div>
                <div class="door-status ${isOnline ? 'online' : 'offline'}">
                    ${isOnline ? 'Online' : 'Offline'}
                </div>
            </div>
            <div class="door-info">
                <p><strong>Location:</strong> ${door.location || 'Unknown'}</p>
                <p><strong>IP:</strong> ${door.controller_ip || 'Unknown'}</p>
                <p><strong>Last Seen:</strong> ${lastSeen}</p>
            </div>
            <div class="door-actions">
                <button class="btn btn-primary btn-sm" data-action="unlock">
                    <i class="fas fa-unlock"></i>
                    Unlock
                </button>
                <button class="btn btn-secondary btn-sm" data-action="lock">
                    <i class="fas fa-lock"></i>
                    Lock
                </button>
                <button class="btn btn-secondary btn-sm" data-action="details">
                    <i class="fas fa-info"></i>
                    Details
                </button>
            </div>
        `;

        // Add event listeners
        this.addEventListener('click', (e) => {
            const action = e.target.closest('[data-action]')?.dataset.action;
            if (action) {
                this.handleAction(action);
            }
        });
    }

    handleAction(action) {
        const { door } = this.state;
        
        switch (action) {
            case 'unlock':
                this.unlockDoor(door.id);
                break;
            case 'lock':
                this.lockDoor(door.id);
                break;
            case 'details':
                this.showDetails(door);
                break;
        }
    }

    async unlockDoor(doorId) {
        this.setState({ loading: true });
        try {
            const response = await window.neoAPI.controlDoor(doorId, 'unlock');
            if (response.success) {
                eventBus.emit('toast', { type: 'success', message: 'Door unlocked successfully' });
            }
        } catch (error) {
            eventBus.emit('toast', { type: 'error', message: 'Failed to unlock door' });
        } finally {
            this.setState({ loading: false });
        }
    }

    async lockDoor(doorId) {
        this.setState({ loading: true });
        try {
            const response = await window.neoAPI.controlDoor(doorId, 'lock');
            if (response.success) {
                eventBus.emit('toast', { type: 'success', message: 'Door locked successfully' });
            }
        } catch (error) {
            eventBus.emit('toast', { type: 'error', message: 'Failed to lock door' });
        } finally {
            this.setState({ loading: false });
        }
    }

    showDetails(door) {
        eventBus.emit('showModal', {
            type: 'doorDetails',
            data: door
        });
    }
}

// Event Item Component
class EventItemComponent extends NeoComponent {
    constructor(element, props = {}) {
        super(element, props);
        this.state = {
            event: props.event || {}
        };
    }

    async render() {
        const { event } = this.state;
        const iconClass = this.getIconClass(event.type);
        const timeAgo = Utils.formatRelativeTime(event.timestamp);
        
        this.element.className = 'event-item';
        this.element.innerHTML = `
            <div class="event-icon ${event.type}">
                <i class="${iconClass}"></i>
            </div>
            <div class="event-content">
                <div class="event-title">${event.title || 'Unknown Event'}</div>
                <div class="event-description">${event.description || ''}</div>
                <div class="event-time">${timeAgo}</div>
            </div>
        `;
    }

    getIconClass(type) {
        const iconMap = {
            'success': 'fas fa-check',
            'error': 'fas fa-times',
            'warning': 'fas fa-exclamation',
            'info': 'fas fa-info',
            'door': 'fas fa-door-open',
            'user': 'fas fa-user',
            'system': 'fas fa-cog'
        };
        return iconMap[type] || 'fas fa-circle';
    }
}

// Stats Card Component
class StatsCardComponent extends NeoComponent {
    constructor(element, props = {}) {
        super(element, props);
        this.state = {
            stat: props.stat || {},
            loading: false
        };
    }

    async render() {
        const { stat } = this.state;
        const { title, value, change, icon, color = 'primary' } = stat;
        
        this.element.className = 'stat-card';
        this.element.innerHTML = `
            <div class="stat-icon" style="background: var(--accent-${color})">
                <i class="${icon}"></i>
            </div>
            <div class="stat-content">
                <h3>${value || '0'}</h3>
                <p>${title || 'Unknown'}</p>
                <span class="stat-change ${change?.type || 'neutral'}">
                    ${change?.value || '0%'}
                </span>
            </div>
        `;
    }
}

// Notification Component
class NotificationComponent extends NeoComponent {
    constructor(element, props = {}) {
        super(element, props);
        this.state = {
            notification: props.notification || {},
            visible: true
        };
    }

    async render() {
        const { notification } = this.state;
        const { type, title, message, timestamp } = notification;
        const timeAgo = Utils.formatRelativeTime(timestamp);
        
        this.element.className = `notification-item ${type}`;
        this.element.innerHTML = `
            <div class="notification-icon ${type}">
                <i class="${this.getIconClass(type)}"></i>
            </div>
            <div class="notification-content">
                <div class="notification-title">${title || 'Notification'}</div>
                <div class="notification-description">${message || ''}</div>
                <div class="notification-time">${timeAgo}</div>
            </div>
            <button class="notification-close" data-action="close">
                <i class="fas fa-times"></i>
            </button>
        `;

        // Add close event listener
        this.addEventListener('click', (e) => {
            if (e.target.closest('[data-action="close"]')) {
                this.close();
            }
        });
    }

    getIconClass(type) {
        const iconMap = {
            'success': 'fas fa-check',
            'error': 'fas fa-times',
            'warning': 'fas fa-exclamation',
            'info': 'fas fa-info'
        };
        return iconMap[type] || 'fas fa-bell';
    }

    async close() {
        this.setState({ visible: false });
        await AnimationUtils.fadeOut(this.element);
        this.element.remove();
    }
}

// Modal Component
class ModalComponent extends NeoComponent {
    constructor(element, props = {}) {
        super(element, props);
        this.state = {
            visible: false,
            type: props.type || 'default',
            data: props.data || null
        };
    }

    async render() {
        const { type, data } = this.state;
        
        this.element.className = `modal ${type}`;
        this.element.innerHTML = `
            <div class="modal-backdrop" data-action="close"></div>
            <div class="modal-content">
                <div class="modal-header">
                    <h3>${this.getTitle(type)}</h3>
                    <button class="modal-close" data-action="close">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    ${this.getContent(type, data)}
                </div>
                <div class="modal-footer">
                    ${this.getActions(type, data)}
                </div>
            </div>
        `;

        // Add event listeners
        this.addEventListener('click', (e) => {
            if (e.target.closest('[data-action="close"]')) {
                this.close();
            }
        });

        // Add keyboard listener
        this.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.close();
            }
        });
    }

    getTitle(type) {
        const titles = {
            'doorDetails': 'Door Details',
            'userDetails': 'User Details',
            'confirm': 'Confirm Action',
            'error': 'Error'
        };
        return titles[type] || 'Modal';
    }

    getContent(type, data) {
        switch (type) {
            case 'doorDetails':
                return this.getDoorDetailsContent(data);
            case 'userDetails':
                return this.getUserDetailsContent(data);
            case 'confirm':
                return `<p>${data?.message || 'Are you sure?'}</p>`;
            case 'error':
                return `<p>${data?.message || 'An error occurred'}</p>`;
            default:
                return '<p>Modal content</p>';
        }
    }

    getDoorDetailsContent(door) {
        if (!door) return '<p>No door data available</p>';
        
        return `
            <div class="door-details">
                <div class="detail-row">
                    <label>Name:</label>
                    <span>${door.name || 'Unknown'}</span>
                </div>
                <div class="detail-row">
                    <label>Location:</label>
                    <span>${door.location || 'Unknown'}</span>
                </div>
                <div class="detail-row">
                    <label>IP Address:</label>
                    <span>${door.controller_ip || 'Unknown'}</span>
                </div>
                <div class="detail-row">
                    <label>Status:</label>
                    <span class="status ${door.is_online ? 'online' : 'offline'}">
                        ${door.is_online ? 'Online' : 'Offline'}
                    </span>
                </div>
                <div class="detail-row">
                    <label>Last Seen:</label>
                    <span>${door.last_seen ? Utils.formatDate(door.last_seen) : 'Never'}</span>
                </div>
            </div>
        `;
    }

    getUserDetailsContent(user) {
        if (!user) return '<p>No user data available</p>';
        
        return `
            <div class="user-details">
                <div class="detail-row">
                    <label>Name:</label>
                    <span>${user.first_name || ''} ${user.last_name || ''}</span>
                </div>
                <div class="detail-row">
                    <label>Email:</label>
                    <span>${user.email || 'Unknown'}</span>
                </div>
                <div class="detail-row">
                    <label>Role:</label>
                    <span class="role ${user.role}">${user.role || 'user'}</span>
                </div>
                <div class="detail-row">
                    <label>Created:</label>
                    <span>${user.created_at ? Utils.formatDate(user.created_at) : 'Unknown'}</span>
                </div>
            </div>
        `;
    }

    getActions(type, data) {
        switch (type) {
            case 'confirm':
                return `
                    <button class="btn btn-secondary" data-action="cancel">Cancel</button>
                    <button class="btn btn-primary" data-action="confirm">Confirm</button>
                `;
            case 'error':
                return `
                    <button class="btn btn-primary" data-action="close">OK</button>
                `;
            default:
                return `
                    <button class="btn btn-secondary" data-action="close">Close</button>
                `;
        }
    }

    async show() {
        this.setState({ visible: true });
        this.element.style.display = 'flex';
        await AnimationUtils.fadeIn(this.element);
    }

    async close() {
        this.setState({ visible: false });
        await AnimationUtils.fadeOut(this.element);
        this.element.style.display = 'none';
    }
}

// Toast Component
class ToastComponent extends NeoComponent {
    constructor(element, props = {}) {
        super(element, props);
        this.state = {
            toast: props.toast || {},
            visible: true
        };
    }

    async render() {
        const { toast } = this.state;
        const { type, message, duration = 5000 } = toast;
        
        this.element.className = `toast ${type}`;
        this.element.innerHTML = `
            <div class="toast-icon">
                <i class="${this.getIconClass(type)}"></i>
            </div>
            <div class="toast-message">${message || 'Notification'}</div>
            <button class="toast-close" data-action="close">
                <i class="fas fa-times"></i>
            </button>
        `;

        // Add close event listener
        this.addEventListener('click', (e) => {
            if (e.target.closest('[data-action="close"]')) {
                this.close();
            }
        });

        // Auto close after duration
        if (duration > 0) {
            setTimeout(() => this.close(), duration);
        }
    }

    getIconClass(type) {
        const iconMap = {
            'success': 'fas fa-check',
            'error': 'fas fa-times',
            'warning': 'fas fa-exclamation',
            'info': 'fas fa-info'
        };
        return iconMap[type] || 'fas fa-bell';
    }

    async close() {
        this.setState({ visible: false });
        await AnimationUtils.fadeOut(this.element);
        this.element.remove();
    }
}

// Loading Component
class LoadingComponent extends NeoComponent {
    constructor(element, props = {}) {
        super(element, props);
        this.state = {
            loading: props.loading || false,
            message: props.message || 'Loading...'
        };
    }

    async render() {
        const { loading, message } = this.state;
        
        if (!loading) {
            this.element.style.display = 'none';
            return;
        }
        
        this.element.className = 'loading-overlay';
        this.element.style.display = 'flex';
        this.element.innerHTML = `
            <div class="loading-content">
                <div class="loading-spinner">
                    <div class="spinner"></div>
                </div>
                <p class="loading-message">${message}</p>
            </div>
        `;
    }
}

// Export components
window.CardComponent = CardComponent;
window.DoorCardComponent = DoorCardComponent;
window.EventItemComponent = EventItemComponent;
window.StatsCardComponent = StatsCardComponent;
window.NotificationComponent = NotificationComponent;
window.ModalComponent = ModalComponent;
window.ToastComponent = ToastComponent;
window.LoadingComponent = LoadingComponent;