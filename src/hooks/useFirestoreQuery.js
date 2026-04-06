import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, getDocs, orderBy } from 'firebase/firestore';

export function useFirestoreQuery(collectionName, orderField = 'createdAt', direction = 'desc') {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const fetchOnce = async () => {
      try {
        const q = query(collection(db, collectionName), orderBy(orderField, direction));
        const snapshot = await getDocs(q);
        if (isMounted) {
          const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setData(docs);
        }
      } catch (err) {
        console.error(`useFirestoreQuery [${collectionName}]:`, err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchOnce();

    return () => { isMounted = false; };
  }, [collectionName, orderField, direction]);

  return { data, loading };
}
