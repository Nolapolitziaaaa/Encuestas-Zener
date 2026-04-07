import api from './api';

const templateService = {
  list: (params) => api.get('/templates', { params }).then((r) => r.data),
  getById: (id) => api.get(`/templates/${id}`).then((r) => r.data),
  create: (data) => api.post('/templates', data).then((r) => r.data),
  update: (id, data) => api.put(`/templates/${id}`, data).then((r) => r.data),
  remove: (id) => api.delete(`/templates/${id}`).then((r) => r.data),
  duplicate: (id, nombre) => api.post(`/templates/${id}/duplicate`, { nombre }).then((r) => r.data),
};

export default templateService;
