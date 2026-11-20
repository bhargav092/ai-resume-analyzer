import { httpClient } from '../../shared/api/httpClient'

export const createGuestSession = () => httpClient.post('/auth/guest-session')
export const authenticate = (mode, credentials) => httpClient.post(`/auth/${mode}`, credentials)
export const authenticateWithGoogle = (credential) => httpClient.post('/auth/google', { credential })
export const getCurrentUser = () => httpClient.get('/auth/me')
export const replaceCurrentUser = (changes) => httpClient.put('/auth/me', changes)
export const updateCurrentUser = (changes) => httpClient.patch('/auth/me', changes)
export const getAccountSettings = () => httpClient.get('/auth/settings')
export const replaceAccountSettings = (changes) => httpClient.put('/auth/settings', changes)
export const updateAccountSettings = (changes) => httpClient.patch('/auth/settings', changes)
