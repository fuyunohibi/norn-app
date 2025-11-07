import { CheckCircle, RefreshCw, XCircle } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { DatabaseService } from '../services/database.service';

interface DatabaseHealthProps {
  userId: string;
}

export const DatabaseHealth: React.FC<DatabaseHealthProps> = ({ userId }) => {
  const [health, setHealth] = useState<{ healthy: boolean; error?: string } | null>(null);
  const [checking, setChecking] = useState(false);

  const checkHealth = async () => {
    setChecking(true);
    try {
      const result = await DatabaseService.checkDatabaseHealth();
      setHealth(result);
    } catch (error) {
      setHealth({ healthy: false, error: 'Health check failed' });
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    checkHealth();
  }, [userId]);

  return (
    <View className="bg-white rounded-2xl p-4 mb-4">
      <View className="flex-row items-center justify-between mb-3">
        <Text className="text-lg font-hell-round-bold text-gray-900 ">
          Database Status
        </Text>
        <TouchableOpacity
          onPress={checkHealth}
          disabled={checking}
          className="p-2"
        >
          <RefreshCw 
            size={20} 
            color="#6B7280" 
            className={checking ? 'animate-spin' : ''}
          />
        </TouchableOpacity>
      </View>

      <View className="flex-row items-center">
        {health?.healthy ? (
          <>
            <CheckCircle size={20} color="#10B981" />
            <Text className="text-green-600 font-hell font-medium ml-2 font-hell">
              Database Connected
            </Text>
          </>
        ) : (
          <>
            <XCircle size={20} color="#EF4444" />
            <Text className="text-red-600 font-hell font-medium ml-2 font-hell">
              Database Error
            </Text>
          </>
        )}
      </View>

      {health?.error && (
        <Text className="text-red-500 text-sm mt-2 font-hell">
          {health.error}
        </Text>
      )}
    </View>
  );
};
