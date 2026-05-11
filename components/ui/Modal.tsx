"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, AlertCircle, CheckCircle, HelpCircle } from "lucide-react";

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm?: () => void;
    title: string;
    message: string;
    type?: "info" | "success" | "warning" | "confirm" | "prompt";
    confirmText?: string;
    cancelText?: string;
    inputValue?: string;
    onInputChange?: (val: string) => void;
}

export function Modal({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    type = "info",
    confirmText = "Aceptar",
    cancelText = "Cancelar",
    inputValue = "",
    onInputChange,
}: ModalProps) {
    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    />

                    {/* Content */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="relative w-full max-w-sm bg-white rounded-[40px] shadow-2xl overflow-hidden"
                    >
                        {/* Header/Icon */}
                        <div className="p-8 pb-4 text-center">
                            <div className="mx-auto w-16 h-16 rounded-3xl bg-gray-50 flex items-center justify-center mb-4">
                                {type === "info" && <AlertCircle className="text-blue-500" size={32} />}
                                {type === "success" && <CheckCircle className="text-green-500" size={32} />}
                                {type === "warning" && <AlertCircle className="text-orange-500" size={32} />}
                                {type === "confirm" && <HelpCircle className="text-black" size={32} />}
                            </div>
                            <h3 className="text-2xl font-black uppercase tracking-tighter text-gray-900 leading-tight">
                                {title}
                            </h3>
                        </div>

                        {/* Message */}
                        <div className="px-8 pb-6 text-center">
                            <p className="text-gray-500 font-medium leading-relaxed mb-4">
                                {message}
                            </p>
                            {type === "prompt" && onInputChange && (
                                <input
                                    type="text"
                                    value={inputValue}
                                    onChange={(e) => onInputChange(e.target.value)}
                                    placeholder="Escribe aquí..."
                                    autoFocus
                                    className="w-full bg-gray-100 border-none rounded-2xl py-4 px-6 text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-black outline-none transition-all"
                                />
                            )}
                        </div>

                        {/* Actions */}
                        <div className="p-4 bg-gray-50 flex gap-3">
                            {type === "confirm" && (
                                <button
                                    onClick={onClose}
                                    className="flex-1 py-4 px-6 rounded-2xl font-bold text-gray-500 hover:bg-gray-200 transition-colors"
                                >
                                    {cancelText}
                                </button>
                            )}
                            <button
                                onClick={() => {
                                    if (onConfirm) onConfirm();
                                    else onClose();
                                }}
                                className={`flex-1 py-4 px-6 rounded-2xl font-bold text-white shadow-lg transition-all active:scale-95 ${
                                    type === "confirm" || type === "info" ? "bg-black" : 
                                    type === "success" ? "bg-green-600" : "bg-orange-600"
                                }`}
                            >
                                {confirmText}
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
