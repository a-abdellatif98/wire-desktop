/*
 * Wire
 * Copyright (C) 2018 Wire Swiss GmbH
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see http://www.gnu.org/licenses/.
 *
 */

export interface Action {
  count?: number;
  data?: any;
  id?: string;
  payload?: any;
  sessionID?: string;
  type: ActionCreator;
}

export enum ActionCreator {
  ADD_ACCOUNT = 'ADD_ACCOUNT',
  DELETE_ACCOUNT = 'DELETE_ACCOUNT',
  HIDE_CONTEXT_MENUS = 'HIDE_CONTEXT_MENUS',
  SWITCH_ACCOUNT = 'SWITCH_ACCOUNT',
  TOGGLE_ADD_ACCOUNT_VISIBILITY = 'TOGGLE_ADD_ACCOUNT_VISIBILITY',
  TOGGLE_EDIT_ACCOUNT_VISIBILITY = 'TOGGLE_EDIT_ACCOUNT_VISIBILITY',
  UPDATE_ACCOUNT = 'UPDATE_ACCOUNT',
  UPDATE_ACCOUNT_BADGE = 'UPDATE_ACCOUNT_BADGE',
  UPDATE_ACCOUNT_LIFECYCLE = 'UPDATE_ACCOUNT_LIFECYCLE',
}

export interface Account {
  accentID?: number;
  badgeCount: number;
  id: string;
  isAdding: boolean;
  lifecycle?: string;
  name?: string;
  picture?: string;
  sessionID?: string;
  teamID?: string;
  teamRole?: string;
  userID?: string;
  visible: boolean;
}