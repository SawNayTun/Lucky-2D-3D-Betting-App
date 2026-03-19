import { useState, useEffect } from 'react';
import { database } from '../lib/firebase';
import { ref, onValue } from 'firebase/database';
import { useAuth } from '../context/AuthContext';

export const usePlayerSync = (dealerId: string | undefined) => {
  const { user } = useAuth();
  const [balance, setBalance] = useState<number>(0);
  const [isBanned, setIsBanned] = useState<boolean>(false);
  const [isDeleted, setIsDeleted] = useState<boolean>(false);

  useEffect(() => {
    if (!user?.id || !dealerId) {
      setBalance(0);
      setIsBanned(false);
      setIsDeleted(false);
      return;
    }

    const playerId = user.id.toString();
    const customerRef = ref(database, `dealer_customers/${dealerId}/${playerId}`);

    const unsubscribeCustomer = onValue(customerRef, (snapshot) => {
      const data = snapshot.val();
      
      if (data) {
        setIsDeleted(false);
        setBalance(data.balance || 0);
        setIsBanned(data.isBanned || false);
      } else {
        setIsDeleted(true);
        setBalance(0);
        setIsBanned(true);
      }
    });

    // Listen to old contacts path as fallback
    const oldContactRef = ref(database, `users/${dealerId}/contacts/${playerId}`);
    const unsubscribeOldContact = onValue(oldContactRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setIsDeleted(prev => {
          if (!prev) {
            if (data.isBanned) setIsBanned(true);
          }
          return prev;
        });
      }
    });

    return () => {
      unsubscribeCustomer();
      unsubscribeOldContact();
    };
  }, [user?.id, dealerId]);

  const effectiveBalance = (!user?.id || !dealerId) ? (user?.balance || 0) : balance;
  return { balance: effectiveBalance, isBanned, isDeleted };
};
