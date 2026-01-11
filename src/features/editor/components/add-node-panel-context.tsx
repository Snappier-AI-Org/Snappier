"use client";

import {
  createContext,
  Dispatch,
  ReactNode,
  SetStateAction,
  useContext,
  useMemo,
  useState,
} from "react";

type AddNodePanelContextValue = {
  isOpen: boolean;
  setIsOpen: Dispatch<SetStateAction<boolean>>;
};

const AddNodePanelContext = createContext<AddNodePanelContextValue | undefined>(undefined);

export function AddNodePanelProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const value = useMemo(
    () => ({
      isOpen,
      setIsOpen,
    }),
    [isOpen],
  );

  return (
    <AddNodePanelContext.Provider value={value}>
      {children}
    </AddNodePanelContext.Provider>
  );
}

export function useAddNodePanel() {
  const context = useContext(AddNodePanelContext);
  if (!context) {
    throw new Error("useAddNodePanel must be used within AddNodePanelProvider");
  }

  return context;
}

