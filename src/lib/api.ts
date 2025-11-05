// API client for backend communication
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://stock-nexus-84-main-2-1.onrender.com/api';

class ApiClient {
  private token: string | null = null;

  constructor() {
    // Get token from localStorage on initialization
    this.token = localStorage.getItem('auth_token');
  }

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('auth_token', token);
    } else {
      localStorage.removeItem('auth_token');
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('API Error:', errorData);
        const error = new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
        (error as any).status = response.status;
        throw error;
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Request failed:', error);
      throw error;
    }
  }

  // Authentication methods
  async login(email: string, password: string) {
    // Debug logging - check what's being sent to backend
    console.log('🌐 API LOGIN DEBUG:');
    console.log('Email to backend:', email);
    console.log('Password to backend:', password);
    console.log('Request body:', JSON.stringify({ email, password }));
    
    const response = await this.request<{
      success: boolean;
      data: {
        user: any;
        token: string;
      };
    }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    if (response.success) {
      this.setToken(response.data.token);
      return response.data;
    }
    throw new Error('Login failed');
  }

  async register(userData: any) {
    const response = await this.request<{
      success: boolean;
      data: {
        user: any;
        token: string;
      };
    }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });

    if (response.success) {
      this.setToken(response.data.token);
      return response.data;
    }
    throw new Error('Registration failed');
  }

  async logout() {
    const response = await this.request<{
      success: boolean;
      message: string;
    }>('/auth/logout', {
      method: 'POST',
    });
    
    this.setToken(null);
    return response;
  }

  async getProfile() {
    const response = await this.request<{
      success: boolean;
      data: any;
    }>('/auth/profile');
    return response.data;
  }


  async getMoveoutList(id: string) {
    const response = await this.request<{
      success: boolean;
      data: any;
    }>(`/moveout/${id}`);
    return response.data;
  }

  async deleteMoveoutList(id: string) {
    const response = await this.request<{
      success: boolean;
    }>(`/moveout/${id}`, {
      method: 'DELETE',
    });
    return response.success;
  }

  // Stock methods
  async getStockData() {
    const response = await this.request<{
      success: boolean;
      data: any[];
    }>('/stock');
    return response.data;
  }

  async updateStockQuantity(
    itemId: string, 
    movementType: string, 
    quantity: number, 
    reason?: string,
    unitType?: string,
    originalQuantity?: number,
    unitLabel?: string
  ) {
    const response = await this.request<{
      success: boolean;
      data: any;
    }>('/stock/movement', {
      method: 'POST',
      body: JSON.stringify({
        item_id: itemId,
        movement_type: movementType,
        quantity,
        reason,
        unit_type: unitType,
        original_quantity: originalQuantity,
        unit_label: unitLabel
      }),
    });
    return response.data;
  }

  // Items methods
  async getItems() {
    const response = await this.request<{
      success: boolean;
      data: any[];
    }>('/items');
    return response.data;
  }

  async createItem(itemData: any) {
    const response = await this.request<{
      success: boolean;
      data: any;
    }>('/items', {
      method: 'POST',
      body: JSON.stringify(itemData)
    });
    return response.data;
  }

  async updateItem(itemId: string, itemData: any) {
    const response = await this.request<{
      success: boolean;
      data: any;
    }>(`/items/${itemId}`, {
      method: 'PUT',
      body: JSON.stringify(itemData)
    });
    return response.data;
  }

  async deleteItem(itemId: string) {
    const response = await this.request<{
      success: boolean;
      data: any;
    }>(`/items/${itemId}`, {
      method: 'DELETE'
    });
    return response.data;
  }

  // Reports methods
  async getStockReport() {
    const response = await this.request<{
      success: boolean;
      data: any[];
    }>('/reports/stock');
    return response.data;
  }

  async getMovementsReport() {
    const response = await this.request<{
      success: boolean;
      data: any[];
    }>('/reports/movements');
    return response.data;
  }

  async getSoftDrinksWeeklyReport(weeks: number = 4) {
    const response = await this.request<{
      success: boolean;
      data: any[];
      summary: any;
    }>(`/reports/softdrinks-weekly?weeks=${weeks}`);
    return response;
  }

  // Analytics methods
  async getAnalyticsData() {
    const response = await this.request<{
      success: boolean;
      data: any;
    }>('/analytics');
    return response.data;
  }

  async getItemUsageAnalytics(period: string = 'daily', itemId?: string) {
    const url = itemId 
      ? `/analytics/item-usage/${period}?itemId=${itemId}`
      : `/analytics/item-usage/${period}`;
    const response = await this.request<{
      success: boolean;
      data: any[];
    }>(url);
    return response.data;
  }

  // Staff/Users methods
  async getStaff() {
    const response = await this.request<{
      success: boolean;
      data: any[];
    }>('/users/staff');
    return response.data;
  }

  async createStaff(staffData: any) {
    const response = await this.request<{
      success: boolean;
      data: any;
    }>('/users/staff', {
      method: 'POST',
      body: JSON.stringify(staffData),
    });
    return response.data;
  }

  async updateStaff(id: string, staffData: any) {
    const response = await this.request<{
      success: boolean;
      data: any;
    }>(`/users/staff/${id}`, {
      method: 'PUT',
      body: JSON.stringify(staffData),
    });
    return response.data;
  }

  async deleteStaff(id: string) {
    const response = await this.request<{
      success: boolean;
    }>(`/users/staff/${id}`, {
      method: 'DELETE',
    });
    return response.success;
  }

  // Notifications methods
  async getNotifications() {
    const response = await this.request<{
      success: boolean;
      data: any[];
    }>('/notifications');
    return response.data;
  }

  async markNotificationAsRead(id: string) {
    const response = await this.request<{
      success: boolean;
    }>(`/notifications/${id}/read`, {
      method: 'PATCH',
    });
    return response.success;
  }

  async getCalendarEvents() {
    const response = await this.request<{
      success: boolean;
      data: any[];
    }>('/calendar-events');
    return response.data;
  }

  async createCalendarEvent(eventData: {
    title: string;
    description?: string;
    event_date: string;
    event_type?: string;
    branch_id?: string;
  }) {
    const response = await this.request<{
      success: boolean;
      data: any;
      message: string;
    }>('/calendar-events', {
      method: 'POST',
      body: JSON.stringify(eventData),
    });
    return response;
  }

  // Region Management methods
  async getRegions() {
    const response = await this.request<{
      success: boolean;
      data: any[];
    }>('/regions');
    return response.data;
  }

  async getAssignedRegionalManagers() {
    const response = await this.request<{
      success: boolean;
      data: string[];
    }>('/regions/assigned-managers');
    return response.data;
  }

  async getAssignedDistrictManagers() {
    const response = await this.request<{
      success: boolean;
      data: string[];
    }>('/districts/assigned-managers');
    return response.data;
  }

  async createRegion(regionData: any) {
    const response = await this.request<{
      success: boolean;
      data: any;
    }>('/regions', {
      method: 'POST',
      body: JSON.stringify(regionData),
    });
    return response.data;
  }

  async updateRegion(id: string, regionData: any) {
    const response = await this.request<{
      success: boolean;
      data: any;
    }>(`/regions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(regionData),
    });
    return response.data;
  }

  async deleteRegion(id: string) {
    const response = await this.request<{
      success: boolean;
    }>(`/regions/${id}`, {
      method: 'DELETE',
    });
    return response.success;
  }

  // District Management methods
  async getDistricts(regionId?: string) {
    const url = regionId ? `/districts?region_id=${regionId}` : '/districts';
    const response = await this.request<{
      success: boolean;
      data: any[];
    }>(url);
    return response.data;
  }

  async createDistrict(districtData: any) {
    const response = await this.request<{
      success: boolean;
      data: any;
    }>('/districts', {
      method: 'POST',
      body: JSON.stringify(districtData),
    });
    return response.data;
  }

  async updateDistrict(id: string, districtData: any) {
    const response = await this.request<{
      success: boolean;
      data: any;
    }>(`/districts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(districtData),
    });
    return response.data;
  }

  async deleteDistrict(id: string) {
    const response = await this.request<{
      success: boolean;
    }>(`/districts/${id}`, {
      method: 'DELETE',
    });
    return response.success;
  }

  // Branch Management methods
  async getBranches(districtId?: string) {
    const url = districtId ? `/branches?district_id=${districtId}` : '/branches';
    const response = await this.request<{
      success: boolean;
      data: any[];
    }>(url);
    return response.data;
  }

  async createBranch(branchData: any) {
    const response = await this.request<{
      success: boolean;
      data: any;
    }>('/branches', {
      method: 'POST',
      body: JSON.stringify(branchData),
    });
    return response.data;
  }

  async updateBranch(id: string, branchData: any) {
    const response = await this.request<{
      success: boolean;
      data: any;
    }>(`/branches/${id}`, {
      method: 'PUT',
      body: JSON.stringify(branchData),
    });
    return response.data;
  }

  async deleteBranch(id: string) {
    const response = await this.request<{
      success: boolean;
    }>(`/branches/${id}`, {
      method: 'DELETE',
    });
    return response.success;
  }


  // Profile/Settings methods
  async updateProfile(profileData: any) {
    const response = await this.request<{
      success: boolean;
      data: any;
    }>('/users/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    });
    return response.data;
  }

  async updatePassword(currentPassword: string, newPassword: string) {
    const response = await this.request<{
      success: boolean;
    }>('/users/password', {
      method: 'PUT',
      body: JSON.stringify({
        current_password: currentPassword,
        new_password: newPassword
      }),
    });
    return response.success;
  }

  async updateBranchSettings(branchId: string, settings: any) {
    const response = await this.request<{
      success: boolean;
      data: any;
    }>(`/branches/${branchId}/settings`, {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
    return response.data;
  }

  async sendTestNotification(type: string, message: string) {
    const response = await this.request<{
      success: boolean;
    }>('/notifications/test', {
      method: 'POST',
      body: JSON.stringify({
        type,
        message
      }),
    });
    return response.success;
  }

  async sendStockAlert(itemName: string, currentQuantity: number, threshold: number, alertType: 'low' | 'critical') {
    const response = await this.request<{
      success: boolean;
    }>('/notifications/stock-alert', {
      method: 'POST',
      body: JSON.stringify({
        item_name: itemName,
        current_quantity: currentQuantity,
        threshold: threshold,
        alert_type: alertType
      }),
    });
    return response.success;
  }

  async initializeStock() {
    const response = await this.request<{
      success: boolean;
      message: string;
      initialized: number;
    }>('/stock/initialize', {
      method: 'POST',
    });
    return response;
  }

  async cleanupResolvedStockAlerts(itemName: string) {
    const response = await this.request<{
      success: boolean;
      message: string;
      cleaned: number;
    }>('/notifications/cleanup-resolved-alerts', {
      method: 'POST',
      body: JSON.stringify({ item_name: itemName }),
    });
    return response;
  }

  async getScheduledAlertStatus() {
    const response = await this.request<{
      success: boolean;
      schedule: {
        frequency: string;
        scheduleDay?: number;
        scheduleDate?: number;
        scheduleTime: string;
      };
    }>('/scheduled-notifications/status', {
      method: 'GET',
    });
    return response.schedule;
  }

  // Update user branch context
  async updateBranchContext(branchId: string) {
    const response = await this.request<{
      success: boolean;
      message: string;
    }>('/users/branch-context', {
      method: 'PUT',
      body: JSON.stringify({ branch_id: branchId }),
    });
    return response;
  }

  // Reset selection completion status
  async resetSelection() {
    const response = await this.request<{
      success: boolean;
      message: string;
    }>('/users/reset-selection', {
      method: 'PUT',
    });
    return response;
  }

  // Activity Logs
  async getActivityLogs(filters?: {
    action?: string;
    user_id?: string;
    date_from?: string;
    date_to?: string;
  }) {
    const params = new URLSearchParams();
    if (filters?.action) params.append('action', filters.action);
    if (filters?.user_id) params.append('user_id', filters.user_id);
    if (filters?.date_from) params.append('date_from', filters.date_from);
    if (filters?.date_to) params.append('date_to', filters.date_to);
    
    const queryString = params.toString();
    const url = queryString ? `/activity-logs?${queryString}` : '/activity-logs';
    
    const response = await this.request<{
      success: boolean;
      data: any[];
    }>(url);
    return response;
  }

  async createActivityLog(data: {
    action: string;
    details?: string;
    entity_type?: string;
    entity_id?: string;
  }) {
    const response = await this.request<{
      success: boolean;
      data: any;
      message: string;
    }>('/activity-logs', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response;
  }

  // Branch Assignments
  async getDistrictManagers() {
    const response = await this.request<{
      success: boolean;
      data: Array<{
        id: string;
        name: string;
        email: string;
        district_id: string;
        district_name: string;
        region_name: string;
        assigned_branches_count: number;
        assigned_branches: Array<{
          id: string;
          name: string;
          district_id: string;
          district_name: string;
        }>;
      }>;
    }>('/branch-assignments/district-managers');
    return response;
  }

  async getAvailableBranches() {
    const response = await this.request<{
      success: boolean;
      data: Array<{
        id: string;
        name: string;
        description: string;
        district_id: string;
        district_name: string;
        region_name: string;
      }>;
    }>('/branch-assignments/available-branches');
    return response;
  }

  async assignBranchesToDistrictManager(data: {
    district_manager_id: string;
    branch_ids: string[];
  }) {
    const response = await this.request<{
      success: boolean;
      message: string;
      data: {
        district_manager_id: string;
        assigned_branches: number;
      };
    }>('/branch-assignments/assign', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response;
  }

  async unassignBranchFromDistrictManager(districtManagerId: string, branchId: string) {
    const response = await this.request<{
      success: boolean;
      message: string;
    }>(`/branch-assignments/unassign/${districtManagerId}/${branchId}`, {
      method: 'DELETE',
    });
    return response;
  }

  async getDistrictManagerAssignments(districtManagerId: string) {
    const response = await this.request<{
      success: boolean;
      data: Array<{
        id: string;
        branch_id: string;
        branch_name: string;
        branch_description: string;
        district_name: string;
        region_name: string;
        assigned_at: string;
        assigned_by_name: string;
      }>;
    }>(`/branch-assignments/district-manager/${districtManagerId}`);
    return response;
  }

  // Setup
  async createDistrictManagerBranchAssignmentsTable() {
    const response = await this.request<{
      success: boolean;
      message: string;
      table_exists: boolean;
    }>('/setup/create-dm-branch-assignments-table', {
      method: 'POST',
    });
    return response;
  }

  // Receipt management
  async getReceipts(): Promise<any[]> {
    try {
      const response = await this.request<any>('/receipts');
      console.log('getReceipts response:', response);
      // Backend returns { success: true, data: [...] }
      const receipts = response.data || response || [];
      console.log('Extracted receipts:', receipts);
      return receipts;
    } catch (error) {
      console.error('Error in getReceipts:', error);
      throw error;
    }
  }

  async submitReceipt(formData: FormData): Promise<any> {
    const url = `${API_BASE_URL}/receipts/submit`;
    
    const headers: HeadersInit = {};
    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  async updateReceiptStatus(id: string, status: string): Promise<any> {
    return this.request<any>(`/receipts/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  }

  async downloadReceiptFile(id: string): Promise<Blob> {
    const url = `${API_BASE_URL}/receipts/${id}/file`;
    
    const headers: HeadersInit = {};
    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    const response = await fetch(url, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response.blob();
  }

  async updateUserSettings(settings: any): Promise<any> {
    return this.request<any>('/users/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
  }

  async updateNotificationSettings(notificationSettings: any): Promise<any> {
    return this.request<any>('/users/settings', {
      method: 'PUT',
      body: JSON.stringify({ notification_settings: notificationSettings }),
    });
  }

  // Moveout List methods
  async getMoveoutLists(): Promise<any[]> {
    const response = await this.request<{
      success: boolean;
      data: any[];
    }>('/moveout-lists');
    return response.data;
  }

  async createMoveoutList(data: {
    title?: string;
    description?: string;
    items: Array<{
      item_id: string;
      item_name: string;
      available_amount: number;
      request_amount: number;
      category: string;
    }>;
  }): Promise<any> {
    const response = await this.request<{
      success: boolean;
      data: any;
    }>('/moveout-lists', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    return response.data;
  }

  async updateMoveoutListStatus(id: string, status: 'active' | 'completed' | 'cancelled'): Promise<any> {
    const response = await this.request<{
      success: boolean;
      data: any;
    }>(`/moveout-lists/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status })
    });
    return response.data;
  }


  async processMoveoutItem(listId: string, itemId: string, quantity: number, userName?: string): Promise<any> {
    const response = await this.request<{
      success: boolean;
      data: any;
    }>(`/moveout-lists/${listId}/process-item`, {
      method: 'POST',
      body: JSON.stringify({ itemId, quantity, userName })
    });
    return response.data;
  }

  // Weather methods
  async getWeather(location: string) {
    try {
      const response = await this.request<{
        success: boolean;
        data: {
          temperature: number;
          condition: string;
          location: string;
          humidity: number;
          windSpeed: number;
          feelsLike: number;
          pressure: number;
          visibility: number;
          uvIndex: number;
          sunrise: string;
          sunset: string;
        };
        fallback?: boolean;
      }>(`/weather/current?location=${encodeURIComponent(location)}`);
      
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Weather test method for debugging
  async testWeatherConfig() {
    const response = await this.request<{
      success: boolean;
      debug: {
        apiKeyConfigured: boolean;
        apiKeyLength: number;
        apiKeyPrefix: string;
        environment: string;
        timestamp: string;
      };
    }>('/weather/test');
    return response.debug;
  }
}

// Export singleton instance
export const apiClient = new ApiClient();
export default ApiClient;

