import { Box, ChakraProvider, Heading, HStack } from '@chakra-ui/react';
import React from 'react';
import logo from '../assets/azure-logo.svg';

import { useAppState } from '../state/store';
import TaskUI from './TaskUI';
import SetAPIKey from './SetAPIKey';
import OptionsDropdown from './OptionsDropdown';

const App = () => {
  const openAIKey = useAppState((state) => state.settings.openAIKey);

  return (
    <ChakraProvider>
      <Box p="8" fontSize="lg" w="full">
        <HStack mb={4} alignItems="center">
          <img
            src={logo}
            width={32}
            height={32}
            className="App-logo"
            alt="Azure Portal Demo logo"
          />

          <Heading as="h1" size="lg" flex={1}>
            AZ Portal Demo
          </Heading>
          <HStack spacing={2}>
            <OptionsDropdown />
          </HStack>
        </HStack>
        {openAIKey ? <TaskUI /> : <SetAPIKey />}
      </Box>
    </ChakraProvider>
  );
};

export default App;
