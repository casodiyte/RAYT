"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";
import { Modal } from "@/components/ui/Modal";

interface ModalOptions {
    title: string;
    message: string;
    type?: "info" | "success" | "warning" | "confirm" | "prompt";
    confirmText?: string;
    cancelText?: string;
    onConfirm?: (inputValue?: string) => void;
}

interface ModalContextType {
    showAlert: (title: string, message: string, type?: "info" | "success" | "warning") => void;
    showConfirm: (title: string, message: string, onConfirm: () => void, options?: Partial<ModalOptions>) => void;
    showPrompt: (title: string, message: string, onConfirm: (val: string) => void, options?: Partial<ModalOptions>) => void;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export function ModalProvider({ children }: { children: ReactNode }) {
    const [isOpen, setIsOpen] = useState(false);
    const [inputValue, setInputValue] = useState("");
    const [config, setConfig] = useState<ModalOptions>({
        title: "",
        message: "",
        type: "info",
    });

    const showAlert = (title: string, message: string, type: "info" | "success" | "warning" = "info") => {
        setConfig({ title, message, type });
        setIsOpen(true);
    };

    const showConfirm = (title: string, message: string, onConfirm: () => void, options?: Partial<ModalOptions>) => {
        setConfig({
            title,
            message,
            onConfirm: () => {
                onConfirm();
                setIsOpen(false);
            },
            type: "confirm",
            ...options
        });
        setIsOpen(true);
    };

    const showPrompt = (title: string, message: string, onConfirm: (val: string) => void, options?: Partial<ModalOptions>) => {
        setInputValue("");
        setConfig({
            title,
            message,
            onConfirm: (val) => {
                onConfirm(val || "");
                setIsOpen(false);
            },
            type: "prompt",
            ...options
        });
        setIsOpen(true);
    };

    const handleClose = () => setIsOpen(false);

    return (
        <ModalContext.Provider value={{ showAlert, showConfirm, showPrompt }}>
            {children}
            <Modal
                isOpen={isOpen}
                onClose={handleClose}
                onConfirm={() => config.onConfirm?.(inputValue)}
                title={config.title}
                message={config.message}
                type={config.type}
                confirmText={config.confirmText}
                cancelText={config.cancelText}
                inputValue={inputValue}
                onInputChange={setInputValue}
            />
        </ModalContext.Provider>
    );
}

export function useModal() {
    const context = useContext(ModalContext);
    if (context === undefined) {
        throw new Error("useModal must be used within a ModalProvider");
    }
    return context;
}
