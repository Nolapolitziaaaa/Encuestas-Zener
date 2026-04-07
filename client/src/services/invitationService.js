import api from './api';

const invitationService = {
  list: (params) => api.get('/invitations', { params }).then((r) => r.data),
  create: (data) => api.post('/invitations', data).then((r) => r.data),
  createBulk: (invitations) => api.post('/invitations/bulk', { invitations }).then((r) => r.data),
  update: (id, data) => api.put(`/invitations/${id}`, data).then((r) => r.data),
  remove: (id) => api.delete(`/invitations/${id}`).then((r) => r.data),
};

export default invitationService;
