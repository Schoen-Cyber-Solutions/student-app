import { LMSProviderConnector } from './LMSProviderConnector';
import { MockLmsConnector } from './MockLmsConnector';
import { BlackboardConnector } from './BlackboardConnector';

type LmsProviderName = 'mock' | 'blackboard';

const CONNECTORS: Record<LmsProviderName, () => LMSProviderConnector> = {
  mock: () => new MockLmsConnector(),
  blackboard: () => new BlackboardConnector(),
};

let activeProvider: LmsProviderName = 'mock';

/** Return the currently active LMS connector. */
export function getActiveLmsConnector(): LMSProviderConnector {
  return CONNECTORS[activeProvider]();
}

/** Switch the active LMS connector at runtime. */
export function setActiveLmsProvider(name: LmsProviderName): void {
  activeProvider = name;
}
