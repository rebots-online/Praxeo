/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
/* tslint:disable */

export interface Example {
  title: string;
  url: string;
  spec: string;
  code: string;
}

export type InputType = 'youtube' | 'text' | 'file' | 'weblink' | 'topic';

export type InputContentType =
  | {type: 'youtube'; url: string}
  | {type: 'text'; description: string}
  | {type: 'file'; file: File; name: string}
  | {type: 'weblink'; url: string}
  | {type: 'topic'; topic: string};
