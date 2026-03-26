import api from './api';

const formService = {
  list: (params) => api.get('/forms', { params }).then((r) => r.data),
  getById: (id) => api.get(`/forms/${id}`).then((r) => r.data),
  create: (data) => api.post('/forms', data).then((r) => r.data),
  remove: (id) => api.delete(`/forms/${id}`).then((r) => r.data),
  getMyPending: () => api.get('/forms/my/pending').then((r) => r.data),
  getMyCompleted: () => api.get('/forms/my/completed').then((r) => r.data),
  saveDraft: (asignacionId, valores) => api.post(`/responses/${asignacionId}/draft`, { valores }).then((r) => r.data),
  loadDraft: (asignacionId) => api.get(`/responses/${asignacionId}/draft`).then((r) => r.data),
};

export default formService;
