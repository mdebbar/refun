// Closure Compiler doesn't like TS enums, so we have to use a class with static
// fields to emulate an enum.
export class DirtyState {
  static Clean = 1;
  static ChildrenOnly = 2;
  static SelfAndChildren = 3;
}
