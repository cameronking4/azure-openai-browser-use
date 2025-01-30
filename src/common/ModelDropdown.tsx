import { Select } from '@chakra-ui/react';
import React from 'react';
import { useAppState } from '../state/store';

const ModelDropdown = () => {
  const selectedModel = useAppState((state) => state.settings.selectedModel);
  const updateSettings = useAppState((state) => state.settings.actions.update);
  const openAIKey = useAppState((state) => state.settings.openAIKey);

  if (!openAIKey) return null;

  return (
    <Select
      value={selectedModel || ''}
      onChange={(e) => updateSettings({ selectedModel: e.target.value })}
    >
      <option value="gpt-4o-mini">GPT-4o mini</option>
    </Select>
  );
};

export default ModelDropdown;
