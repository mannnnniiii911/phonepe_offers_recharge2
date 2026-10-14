import { useContext } from 'react';
import { RechargeContext } from './RechargeContext';

export const useRecharge = () => {
  const context = useContext(RechargeContext);
  if (!context) {
    throw new Error('useRecharge must be used within a RechargeProvider');
  }
  return context;
};
