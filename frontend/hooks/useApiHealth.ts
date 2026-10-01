import { useEffect, useState } from "react";
import { healthService, HealthStatusResponse } from "@/services/health.service";

export function useApiHealth() {
  const [data, setData] = useState<HealthStatusResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isError, setIsError] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    const check = async () => {
      try {
        const res = await healthService.getHealthStatus();
        if (isMounted) {
          setData(res);
          setIsError(false);
        }
      } catch {
        if (isMounted) {
          setIsError(true);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    check();
    return () => {
      isMounted = false;
    };
  }, []);

  return { data, isLoading, isError, isOnline: data?.status === "success" };
}
