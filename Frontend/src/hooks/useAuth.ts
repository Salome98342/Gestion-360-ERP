import { useContext } from 'react';
import { AuthContext } from '../contexts/authContextInternal';
import { getAccessToken } from '../contexts/authTokenStore';


export function useAuth() {
	const ctx = useContext(AuthContext);
	if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
	return ctx;
}


export { getAccessToken };
