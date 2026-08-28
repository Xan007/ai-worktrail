import * as React from 'react';
import { toast, type ToastContentProps } from 'react-toastify';

const baseOptions = {
  autoClose: 4000,
  closeButton: false,
  closeOnClick: false,
  pauseOnHover: true,
  draggable: true,
  pauseOnFocusLoss: true,
  theme: 'light' as const,
  position: 'bottom-right' as const,
} as const;

export function showSuccess(message: string) {
  toast.success(message, baseOptions);
}

export function showSuccessNoProgress(message: string) {
  toast.success(message, { ...baseOptions, hideProgressBar: true });
}

export function showError(message: string) {
  toast.error(message, baseOptions);
}

export function showInfo(message: string) {
  toast.info(message, baseOptions);
}

function UndoContent({
  closeToast,
  message,
  onUndo,
}: {
  closeToast: (reason?: string | boolean) => void;
  message: string;
  onUndo: () => void | Promise<void>;
}) {
  return React.createElement(
    'div',
    { className: 'flex items-center justify-between gap-3' },
    React.createElement('span', { className: 'text-sm font-medium text-[#1A2332]' }, message),
    React.createElement(
      'button',
      {
        type: 'button',
        onClick: () => {
          void onUndo();
          closeToast('undo');
        },
        className: 'shrink-0 rounded-md bg-[#1E5AA8] px-2.5 py-1 text-xs font-semibold text-white hover:bg-[#174A8C]',
      },
      'Deshacer',
    ),
  );
}

function TaskCreatedContent({
  closeToast,
  taskName,
  onView,
}: {
  closeToast: (reason?: string | boolean) => void;
  taskName: string;
  onView: () => void;
}) {
  return React.createElement(
    'div',
    { className: 'flex items-center justify-between gap-3' },
    React.createElement('span', { className: 'text-sm font-medium text-[#1A2332]' }, `Tarea “${taskName}” creada`),
    React.createElement(
      'button',
      {
        type: 'button',
        onClick: () => {
          onView();
          closeToast();
        },
        className: 'shrink-0 rounded-md bg-[#1E5AA8] px-2.5 py-1 text-xs font-semibold text-white hover:bg-[#174A8C]',
      },
      'Ver',
    ),
  );
}

/**
 * Muestra toast de borrado con botón Deshacer (solo para borrar tareas, como pide el producto).
 * El llamador debe haber borrado ya de forma optimista (Notion). Si el usuario pulsa Deshacer,
 * se ejecuta onUndo (re-crear). Si no, se confirma el borrado.
 */
export function showUndoDeleteTask({
  taskName,
  onUndo,
  duration = 5000,
}: {
  taskName: string;
  onUndo: () => void | Promise<void>;
  duration?: number;
}) {
  let undone = false;
  const handleUndo = async () => {
    undone = true;
    await onUndo();
    toast.success('Tarea restaurada', baseOptions);
  };

  toast(
    ((props: ToastContentProps) =>
      React.createElement(UndoContent, {
        closeToast: props.closeToast as (r?: string | boolean) => void,
        message: `Tarea “${taskName}” eliminada`,
        onUndo: () => void handleUndo(),
      })) as unknown as React.ReactNode,
    {
      ...baseOptions,
      autoClose: duration,
      hideProgressBar: false,
      onClose: (reason) => {
        if (reason === 'undo' || undone) return;
        toast.success(`Tarea “${taskName}” eliminada`, baseOptions);
      },
    },
  );
}

export function showTaskCreated({
  taskName,
  taskId,
  courseId,
  navigate,
}: {
  taskName: string;
  taskId: string;
  courseId: string;
  navigate: (path: string) => void;
}) {
  toast(
    ((props: ToastContentProps) =>
      React.createElement(TaskCreatedContent, {
        closeToast: props.closeToast as (r?: string | boolean) => void,
        taskName,
        onView: () => {
          props.closeToast();
          navigate(`/courses/${courseId}/tasks/${taskId}`);
        },
      })) as unknown as React.ReactNode,
    {
      ...baseOptions,
      autoClose: 4000,
    },
  );
}
