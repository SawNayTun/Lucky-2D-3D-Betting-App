import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { usePlayerSync } from '../hooks/usePlayerSync';

const GlobalPlayerSync = () => {
  const { user } = useAuth();
  const [dealerId, setDealerId] = useState<string | undefined>(
    localStorage.getItem(`last_dealer_id_${user?.id}`) || undefined
  );

  useEffect(() => {
    const handleDealerChange = () => {
      setDealerId(localStorage.getItem(`last_dealer_id_${user?.id}`) || undefined);
    };

    window.addEventListener('dealerChanged', handleDealerChange);
    return () => window.removeEventListener('dealerChanged', handleDealerChange);
  }, [user?.id]);

  // This will mount the hook globally and run the two-way sync
  usePlayerSync(dealerId);

  return null;
};

export default GlobalPlayerSync;
