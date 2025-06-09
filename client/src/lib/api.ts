// Re-export the apiRequest function from queryClient for backwards compatibility
export { apiRequest, queryClient, getQueryFn } from './queryClient'; 

// Post query function for mutations
export const postQueryFn = (url: string) => async (data: unknown) => {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const text = await response.text() || response.statusText;
    throw new Error(`${response.status}: ${text}`);
  }

  return await response.json();
};

// Service Scope Template endpoints
export const scopeTemplateApi = {
  async getTemplate(serviceId: number) {
    try {
      const response = await fetch(`/api/services/${serviceId}/scope-template`, {
        credentials: 'include',
      });
      
      if (response.status === 403) {
        throw new Error('Admin access required to view scope templates');
      }
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to fetch template: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Get template error:', error);
      throw error;
    }
  },
  
  async updateTemplate(serviceId: number, template: any) {
    try {
      const response = await fetch(`/api/services/${serviceId}/scope-template`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ template }),
      });
      
      if (response.status === 403) {
        throw new Error('Admin access required to modify scope templates');
      }
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to update template: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Update template error:', error);
      throw error;
    }
  }
}; 