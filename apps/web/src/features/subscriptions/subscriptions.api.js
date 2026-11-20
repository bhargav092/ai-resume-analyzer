import { httpClient } from '../../shared/api/httpClient'

export const getSubscriptionStatus = () => httpClient.get('/subscriptions/status')
export const createSubscriptionOrder = (planId, method) => httpClient.post('/subscriptions/orders', { planId, method })
export const createQrPayment = (planId) => httpClient.post('/subscriptions/qr-codes', { planId })
export const getQrPaymentStatus = (id) => httpClient.get(`/subscriptions/qr-codes/${id}/status`)
export const verifySubscriptionPayment = (payment) => httpClient.post('/subscriptions/verify', payment)
