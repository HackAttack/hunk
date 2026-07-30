import type { KeyEvent } from "@opentui/core";
import { useKeyboard } from "@opentui/react";
import { useRef } from "react";
import type { MenuId } from "../components/chrome/menu";
import { dispatchAppCommand, type AppCommand } from "../lib/appCommands";
import type { ExtensionDialogRequest } from "../lib/extensionDialogs";
import { isEscapeKey, isSaveDraftNoteKey } from "../lib/keyboard";

type FocusArea = "files" | "filter" | "note";

export interface UseAppKeyboardShortcutsOptions {
  activeMenuId: MenuId | null;
  activateCurrentMenuItem: () => void;
  closeAgentSkill: () => void;
  closeHelp: () => void;
  closeMenu: () => void;
  acceptThemeSelector: () => void;
  cancelDraftNote: () => void;
  closeThemeSelector: () => void;
  closeExtensionTrustPrompt: () => void;
  /**
   * Every app-level shortcut, built-in and extension-contributed, in dispatch
   * order. Modal navigation stays in this hook; commands own the rest.
   */
  commands: readonly AppCommand[];
  denyRepoExtensions: () => void;
  /** The extension dialog currently on screen, or `null` when none is. */
  extensionDialog: ExtensionDialogRequest | null;
  acceptExtensionDialog: () => void;
  cancelExtensionDialog: () => void;
  moveExtensionDialogSelection: (delta: number) => void;
  extensionTrustPromptOpen: boolean;
  trustRepoExtensions: () => void;
  focusArea: FocusArea;
  moveMenuItem: (delta: number) => void;
  moveThemeSelector: (delta: number) => void;
  openMenu: (menuId: MenuId) => void;
  saveConfigPromptOpen: boolean;
  saveViewPreferencesAndQuit: () => void;
  discardViewPreferencesAndQuit: () => void;
  neverAskToSaveViewPreferencesAndQuit: () => void;
  closeSaveConfigPrompt: () => void;
  saveDraftNote: () => void;
  showAgentSkill: boolean;
  showHelp: boolean;
  switchMenu: (delta: number) => void;
  toggleFocusArea: () => void;
  themeSelectorOpen: boolean;
}

/**
 * Register the app's scoped keyboard handling while keeping mode precedence
 * explicit.
 *
 * Modal surfaces (the trust prompt, save-config prompt, dialogs, the theme
 * selector, open menus, focused text inputs) answer first, in a fixed order —
 * their keys are the structure of the widget that owns them. Everything that
 * falls through lands in the command table, where built-in shortcuts and
 * extension commands share one dispatch path.
 */
export function useAppKeyboardShortcuts({
  activeMenuId,
  activateCurrentMenuItem,
  closeAgentSkill,
  closeHelp,
  closeMenu,
  acceptThemeSelector,
  cancelDraftNote,
  closeThemeSelector,
  closeExtensionTrustPrompt,
  commands,
  denyRepoExtensions,
  extensionDialog,
  acceptExtensionDialog,
  cancelExtensionDialog,
  moveExtensionDialogSelection,
  extensionTrustPromptOpen,
  trustRepoExtensions,
  focusArea,
  moveMenuItem,
  moveThemeSelector,
  openMenu,
  saveConfigPromptOpen,
  saveViewPreferencesAndQuit,
  discardViewPreferencesAndQuit,
  neverAskToSaveViewPreferencesAndQuit,
  closeSaveConfigPrompt,
  saveDraftNote,
  showAgentSkill,
  showHelp,
  switchMenu,
  toggleFocusArea,
  themeSelectorOpen,
}: UseAppKeyboardShortcutsOptions) {
  const activeMenuIdRef = useRef(activeMenuId);
  const commandsRef = useRef(commands);
  const focusAreaRef = useRef(focusArea);
  const showAgentSkillRef = useRef(showAgentSkill);
  const showHelpRef = useRef(showHelp);
  const saveConfigPromptOpenRef = useRef(saveConfigPromptOpen);
  const themeSelectorOpenRef = useRef(themeSelectorOpen);
  const extensionTrustPromptOpenRef = useRef(extensionTrustPromptOpen);
  const extensionDialogRef = useRef(extensionDialog);
  // These three close over live dialog state (the highlighted option, the typed
  // text), so they are read through refs rather than captured once.
  const acceptExtensionDialogRef = useRef(acceptExtensionDialog);
  const cancelExtensionDialogRef = useRef(cancelExtensionDialog);
  const moveExtensionDialogSelectionRef = useRef(moveExtensionDialogSelection);

  activeMenuIdRef.current = activeMenuId;
  commandsRef.current = commands;
  focusAreaRef.current = focusArea;
  showAgentSkillRef.current = showAgentSkill;
  showHelpRef.current = showHelp;
  saveConfigPromptOpenRef.current = saveConfigPromptOpen;
  themeSelectorOpenRef.current = themeSelectorOpen;
  extensionTrustPromptOpenRef.current = extensionTrustPromptOpen;
  extensionDialogRef.current = extensionDialog;
  acceptExtensionDialogRef.current = acceptExtensionDialog;
  cancelExtensionDialogRef.current = cancelExtensionDialog;
  moveExtensionDialogSelectionRef.current = moveExtensionDialogSelection;

  const consumeKey = (key: KeyEvent) => {
    key.preventDefault();
    key.stopPropagation();
  };

  const handleMenuToggleShortcut = (key: KeyEvent) => {
    if (key.name !== "f10") {
      return false;
    }

    if (activeMenuIdRef.current) {
      closeMenu();
    } else {
      openMenu("file");
    }

    return true;
  };

  const handleDialogShortcut = (key: KeyEvent) => {
    if (!isEscapeKey(key)) {
      return false;
    }

    if (showAgentSkillRef.current) {
      closeAgentSkill();
      return true;
    }

    if (showHelpRef.current) {
      closeHelp();
      return true;
    }

    return false;
  };

  const handleSaveConfigPromptShortcut = (key: KeyEvent) => {
    if (!saveConfigPromptOpenRef.current) {
      return false;
    }

    consumeKey(key);
    if (key.name === "return" || key.name === "enter" || key.name === "s" || key.sequence === "s") {
      saveViewPreferencesAndQuit();
      return true;
    }

    // "q" again quits and discards, so a double-tap of the quit key always exits.
    if (key.name === "q" || key.sequence === "q") {
      discardViewPreferencesAndQuit();
      return true;
    }

    if (key.name === "n" || key.sequence === "n") {
      neverAskToSaveViewPreferencesAndQuit();
      return true;
    }

    if (isEscapeKey(key)) {
      closeSaveConfigPrompt();
      return true;
    }

    return true;
  };

  /**
   * Own every key while the repo-extension trust prompt is up.
   *
   * The prompt is a security decision, so no key may fall through to review
   * navigation and leave it ambiguous which choice the user just made. Escape
   * is deliberately the same as "not now": dismiss, persist nothing.
   */
  const handleExtensionTrustPromptShortcut = (key: KeyEvent) => {
    if (!extensionTrustPromptOpenRef.current) {
      return false;
    }

    consumeKey(key);
    if (key.name === "return" || key.name === "enter" || key.name === "t" || key.sequence === "t") {
      trustRepoExtensions();
      return true;
    }

    if (key.name === "n" || key.sequence === "n") {
      denyRepoExtensions();
      return true;
    }

    if (isEscapeKey(key)) {
      closeExtensionTrustPrompt();
      return true;
    }

    return true;
  };

  /**
   * Own every key while an extension dialog is up.
   *
   * Modal in the same sense the trust prompt is: a question is on screen and no
   * key may quietly do something else with the review behind it. It sits below
   * Hunk's own app-critical prompts — those are about the session itself, and an
   * extension may not outrank them — and above menus, help, and the command
   * table.
   *
   * The input kind is the one exception to consuming keys outright: it returns
   * handled without preventing the event, so the focused OpenTUI field still
   * receives typing and editing keys while global shortcuts stay suppressed.
   */
  const handleExtensionDialogShortcut = (key: KeyEvent) => {
    const dialog = extensionDialogRef.current;
    if (!dialog) {
      return false;
    }

    if (isEscapeKey(key)) {
      consumeKey(key);
      cancelExtensionDialogRef.current();
      return true;
    }

    if (key.name === "return" || key.name === "enter") {
      consumeKey(key);
      acceptExtensionDialogRef.current();
      return true;
    }

    if (dialog.kind === "select") {
      if (key.name === "up") {
        consumeKey(key);
        moveExtensionDialogSelectionRef.current(-1);
        return true;
      }

      if (key.name === "down" || key.name === "tab") {
        consumeKey(key);
        moveExtensionDialogSelectionRef.current(key.shift ? -1 : 1);
        return true;
      }
    }

    if (dialog.kind === "confirm") {
      if (key.name === "y" || key.sequence === "y") {
        consumeKey(key);
        acceptExtensionDialogRef.current();
        return true;
      }

      if (key.name === "n" || key.sequence === "n") {
        consumeKey(key);
        cancelExtensionDialogRef.current();
        return true;
      }
    }

    if (dialog.kind !== "input") {
      consumeKey(key);
    }

    return true;
  };

  const handleThemeSelectorShortcut = (key: KeyEvent) => {
    if (!themeSelectorOpenRef.current) {
      return false;
    }

    if (isEscapeKey(key)) {
      consumeKey(key);
      closeThemeSelector();
      return true;
    }

    if (key.name === "up") {
      consumeKey(key);
      moveThemeSelector(-1);
      return true;
    }

    if (key.name === "down") {
      consumeKey(key);
      moveThemeSelector(1);
      return true;
    }

    if (key.name === "tab") {
      consumeKey(key);
      moveThemeSelector(key.shift ? -1 : 1);
      return true;
    }

    if (key.name === "return" || key.name === "enter") {
      consumeKey(key);
      acceptThemeSelector();
      return true;
    }

    return true;
  };

  const handleMenuShortcut = (key: KeyEvent) => {
    if (!activeMenuIdRef.current) {
      return false;
    }

    if (isEscapeKey(key)) {
      closeMenu();
      return true;
    }

    if (key.name === "left") {
      switchMenu(-1);
      return true;
    }

    if (key.name === "right" || key.name === "tab") {
      switchMenu(1);
      return true;
    }

    if (key.name === "up") {
      moveMenuItem(-1);
      return true;
    }

    if (key.name === "down") {
      moveMenuItem(1);
      return true;
    }

    if (key.name === "return" || key.name === "enter") {
      activateCurrentMenuItem();
      return true;
    }

    return false;
  };

  const handleFocusedInputShortcut = (key: KeyEvent) => {
    if (focusAreaRef.current === "filter") {
      if (key.name === "tab") {
        toggleFocusArea();
        return true;
      }

      // Let the focused input own filter editing and escape handling.
      return true;
    }

    if (focusAreaRef.current !== "note") {
      return false;
    }

    if (isEscapeKey(key)) {
      consumeKey(key);
      cancelDraftNote();
      return true;
    }

    if (isSaveDraftNoteKey(key)) {
      consumeKey(key);
      saveDraftNote();
      return true;
    }

    // Let the focused inline note input own text editing.
    return true;
  };

  useKeyboard((key: KeyEvent) => {
    if (handleExtensionTrustPromptShortcut(key)) {
      return;
    }

    if (handleSaveConfigPromptShortcut(key)) {
      return;
    }

    if (handleExtensionDialogShortcut(key)) {
      return;
    }

    if (handleMenuToggleShortcut(key)) {
      return;
    }

    if (handleDialogShortcut(key)) {
      return;
    }

    if (handleThemeSelectorShortcut(key)) {
      return;
    }

    if (handleMenuShortcut(key)) {
      return;
    }

    if (handleFocusedInputShortcut(key)) {
      return;
    }

    const matched = dispatchAppCommand(commandsRef.current, key);
    if (matched?.closesMenu) {
      closeMenu();
    }
  });
}
