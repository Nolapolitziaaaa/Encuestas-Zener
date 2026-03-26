import api from './api';

const reportService = {
  summary: () => api.get('/reports/summary').then((r) => r.data),
  formDetail: (id) => api.get(`/reports/form/${id}`).then((r) => r.data),
  formResponses: (id) => api.get(`/reports/form/${id}/responses`).then((r) => r.data),
  formUserStatus: (id) => api.get(`/reports/form/${id}/users`).then((r) => r.data),
  exportForm: (id, format = 'xlsx') =>
    api.get(`/reports/export/${id}`, { params: { format }, responseType: 'blob' }).then((r) => r.data),
  reportByUser: (params) => api.get('/reports/users', { params }).then((r) => r.data),
  reportSurveys: (params) => api.get('/reports/surveys', { params }).then((r) => r.data),
  userDetail: (userId) => api.get(`/reports/user/${userId}/detail`).then((r) => r.data),
};

export default reportService;
