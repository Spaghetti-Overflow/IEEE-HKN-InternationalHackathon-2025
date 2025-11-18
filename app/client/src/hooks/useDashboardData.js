import { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../api/client.js';

const API_ROOT = import.meta.env.VITE_API_URL || 'http://localhost:4000';
const ANALYTICS_DEFAULT = {
  categories: [],
  trend: [],
  deadlineCounts: {},
  balance: null,
  upcoming: [],
  projectionWindowDays: 30
};

const normalizeAnalytics = (payload = {}) => ({
  categories: payload.categories || [],
  trend: payload.trend || [],
  deadlineCounts: payload.deadlineCounts || {},
  balance: payload.balance || null,
  upcoming: payload.upcoming || [],
  projectionWindowDays: payload.projectionWindowDays || ANALYTICS_DEFAULT.projectionWindowDays
});

function withReceiptUrl(transaction) {
  if (!transaction.receiptPath) {
    return { ...transaction, receiptUrl: null };
  }
  const parts = transaction.receiptPath.split('/uploads/');
  const publicPath = parts[1] ? `${API_ROOT}/uploads/${parts[1]}` : transaction.receiptPath;
  return { ...transaction, receiptUrl: publicPath };
}

function handleError(error) {
  console.error(error);
  const message = error?.response?.data?.message || error.message || 'Unexpected error';
  return message;
}

export default function useDashboardData() {
  const [budgets, setBudgets] = useState([]);
  const [selectedBudgetId, setSelectedBudgetId] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [deadlines, setDeadlines] = useState([]);
  const [events, setEvents] = useState([]);
  const [analytics, setAnalytics] = useState(ANALYTICS_DEFAULT);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchBudgets = useCallback(async () => {
    try {
      const { data } = await api.get('/budgets');
      setBudgets(data);
      const preferred = data.find((b) => b.isCurrentYear) || data[0];
      setSelectedBudgetId((current) => (current ? current : preferred?.id || null));
      if (!data.length) {
        setSelectedBudgetId(null);
      }
    } catch (err) {
      setError(handleError(err));
    }
  }, []);

  const fetchBudgetScopedData = useCallback(
    async (budgetId) => {
      if (!budgetId) {
        return;
      }
      setLoading(true);
      try {
        const [txRes, dlRes, evRes, analyticsRes] = await Promise.all([
          api.get('/transactions', { params: { budgetId } }),
          api.get('/deadlines'),
          api.get('/events'),
          api.get('/analytics/overview', { params: { budgetId } })
        ]);
        setTransactions(txRes.data.filter((tx) => tx.budgetId === budgetId).map(withReceiptUrl));
        setDeadlines(dlRes.data.filter((dl) => dl.budgetId === budgetId));
        setEvents(evRes.data.filter((ev) => ev.budgetId === budgetId));
        setAnalytics(normalizeAnalytics(analyticsRes.data));
      } catch (err) {
        setError(handleError(err));
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchBudgets();
  }, [fetchBudgets]);

  useEffect(() => {
    if (selectedBudgetId) {
      fetchBudgetScopedData(selectedBudgetId);
    }
  }, [selectedBudgetId, fetchBudgetScopedData]);

  const refreshActiveBudget = useCallback(async () => {
    if (!selectedBudgetId) {
      return;
    }
    await Promise.all([fetchBudgetScopedData(selectedBudgetId), fetchBudgets()]);
  }, [fetchBudgetScopedData, fetchBudgets, selectedBudgetId]);

  const createBudget = async (payload) => {
    try {
      await api.post('/budgets', payload);
      await fetchBudgets();
    } catch (err) {
      setError(handleError(err));
    }
  };

  const updateBudget = async (id, payload) => {
    try {
      await api.put(`/budgets/${id}`, payload);
      await fetchBudgets();
    } catch (err) {
      setError(handleError(err));
    }
  };

  const deleteBudget = async (id) => {
    try {
      await api.delete(`/budgets/${id}`);
      await fetchBudgets();
      if (selectedBudgetId === id) {
        setSelectedBudgetId(null);
      }
    } catch (err) {
      setError(handleError(err));
    }
  };

  const saveTransaction = async (payload, id) => {
    try {
      if (id) {
        await api.put(`/transactions/${id}`, payload);
      } else {
        await api.post('/transactions', payload);
      }
      await refreshActiveBudget();
    } catch (err) {
      setError(handleError(err));
    }
  };

  const deleteTransaction = async (id) => {
    try {
      await api.delete(`/transactions/${id}`);
      await refreshActiveBudget();
    } catch (err) {
      setError(handleError(err));
    }
  };

  const uploadReceipt = async (id, file) => {
    const formData = new FormData();
    formData.append('receipt', file);
    try {
      await api.post(`/transactions/${id}/receipt`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      await refreshActiveBudget();
    } catch (err) {
      setError(handleError(err));
      throw err;
    }
  };

  const saveDeadline = async (payload, id) => {
    try {
      if (id) {
        await api.put(`/deadlines/${id}`, payload);
      } else {
        await api.post('/deadlines', payload);
      }
      await refreshActiveBudget();
    } catch (err) {
      setError(handleError(err));
    }
  };

  const deleteDeadline = async (id) => {
    try {
      await api.delete(`/deadlines/${id}`);
      await refreshActiveBudget();
    } catch (err) {
      setError(handleError(err));
    }
  };

  const saveEvent = async (payload, id) => {
    try {
      if (id) {
        await api.put(`/events/${id}`, payload);
      } else {
        await api.post('/events', payload);
      }
      await refreshActiveBudget();
    } catch (err) {
      setError(handleError(err));
    }
  };

  const deleteEvent = async (id) => {
    try {
      await api.delete(`/events/${id}`);
      await refreshActiveBudget();
    } catch (err) {
      setError(handleError(err));
    }
  };

  const exportsBaseUrl = useMemo(() => {
    if (!selectedBudgetId) return null;
    const apiBase = `${API_ROOT}/api/exports`;
    return `${apiBase}/budget/${selectedBudgetId}`;
  }, [selectedBudgetId]);

  return {
    budgets,
    selectedBudgetId,
    setSelectedBudgetId,
    transactions,
    deadlines,
    events,
    analytics,
    loading,
    error,
    createBudget,
    updateBudget,
    deleteBudget,
    saveTransaction,
    deleteTransaction,
    uploadReceipt,
    saveDeadline,
    deleteDeadline,
    saveEvent,
    deleteEvent,
    refreshActiveBudget,
    exportsBaseUrl
  };
}