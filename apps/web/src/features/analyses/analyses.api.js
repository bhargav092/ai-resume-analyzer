import { httpClient } from '../../shared/api/httpClient'

export const listAnalyses = () => httpClient.get('/analyses')
export const getAnalysis = (id) => httpClient.get(`/analyses/${id}`)
export const createAnalysis = (form) => httpClient.post('/analyses', form)
export const replaceAnalysis = (id, changes) => httpClient.put(`/analyses/${id}`, changes)
export const updateAnalysis = (id, changes) => httpClient.patch(`/analyses/${id}`, changes)
export const deleteAnalysis = (id) => httpClient.delete(`/analyses/${id}`)
export const exportAnalysis = (id) => httpClient.get(`/analyses/${id}/export`)
