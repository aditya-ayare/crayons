/* eslint-disable jsx-a11y/no-static-element-interactions */
import {
  Component,
  Element,
  Event,
  EventEmitter,
  Listen,
  Method,
  Prop,
  State,
  Watch,
  h,
  Fragment,
} from '@stencil/core';
import { range, uniq } from 'lodash-es';
import {
  handleKeyDown,
  renderHiddenField,
  hasSlot,
  isEqual,
} from '../../utils';
import FieldControl from '../../function-components/field-control';

import {
  DropdownVariant,
  TagVariant,
  PopoverPlacementType,
} from '../../utils/types';

import { TranslationController } from '../../global/Translation';
@Component({
  tag: 'fw-select',
  styleUrl: 'select.scss',
  shadow: true,
})
export class Select {
  @Element() host: HTMLElement;
  private selectInput?: HTMLInputElement;
  private fwListOptions?: HTMLFwListOptionsElement;
  private popoverRef?: HTMLFwPopoverElement;
  private tagContainer: HTMLElement;
  private tagArrowKeyCounter = 0;
  private hostId;

  private changeEmittable = () => !this.disabled;

  private innerOnFocus = (e: Event) => {
    if (this.changeEmittable()) {
      this.hasFocus = true;
      this.fwFocus.emit(e);
      this.focusedValues = [];
    }
  };

  private innerOnClick = () => {
    if (this.changeEmittable()) {
      this.setFocus();
      // Select the whole text in case of single select
      this.multiple || this.selectInput?.select?.();
      if (!['search', 'mail'].includes(this.variant)) {
        this.openDropdown();
      }
      this.focusedValues = [];
    }
  };

  private innerOnBlur = (e: Event) => {
    if (this.changeEmittable()) {
      this.hasFocus = false;
      this.fwBlur.emit({
        event: e,
        name: this.name,
      });
    }
  };

  private openDropdown = () => {
    if (!this.isExpanded && this.changeEmittable()) {
      this.popoverRef.show();
    }
  };

  private closeDropdown = () => {
    if (this.isExpanded && this.changeEmittable()) {
      this.popoverRef.hide();
    }
  };

  /**
   * If the dropdown is shown or not
   */
  @State() isExpanded = false;
  @State() hasFocus = false;
  @State() searchValue;
  @State() dataSource;
  @State() selectedOptionsState = [];
  @State() isLoading = false;
  @State() focusedOptionId = '';
  @State() hasHintTextSlot = false;
  @State() hasWarningTextSlot = false;
  @State() hasErrorTextSlot = false;
  @State() focusedValues = [];

  /**
   * Label displayed on the interface, for the component.
   */
  @Prop() label = '';
  /**
   * Value of the option that is displayed as the default selection, in the list box. Must be a valid value corresponding to the fw-select-option components used in Select.
   */
  @Prop({ mutable: true }) value: any;
  /**
   * Name of the component, saved as part of form data.
   */
  @Prop() name = '';
  /**
   * Type of option accepted as the input value. If a user tries to enter an option other than the specified type, the list is not populated.
   */
  @Prop() type: 'text' | 'number' = 'text';
  /**
   * Text displayed in the list box before an option is selected.
   */
  @Prop() placeholder?: string | null;
  /**
   * Theme based on which the list box is styled.
   */
  @Prop() state: 'normal' | 'warning' | 'error' = 'normal';

  /**
   * If true, the user cannot modify the default value selected. If the attribute's value is undefined, the value is set to true.
   */
  @Prop() readonly = false;
  /**
   * Specifies the select field as a mandatory field and displays an asterisk next to the label. If the attribute’s value is undefined, the value is set to false.
   */
  @Prop() required = false;
  /**
   * If true, the user must select a value. The default value is not displayed.
   */
  @Prop() forceSelect = true;
  /**
   * Disables the component on the interface. If the attribute’s value is undefined, the value is set to false.
   */
  @Prop() disabled = false;
  /**
   * Enables selection of multiple options. If the attribute’s value is undefined, the value is set to false.
   */
  @Prop({ mutable: true }) multiple = false;
  /**
   * Works with `multiple` enabled. Configures the maximum number of options that can be selected with a multi-select component.
   */
  @Prop() max = Number.MAX_VALUE;
  /**
   * The UI variant of the select to be used.
   */
  @Prop() variant: 'button' | 'standard' | 'mail' | 'search' = 'standard';
  /**
   * Standard is the default option without any graphics other options are icon and avatar which places either the icon or avatar at the beginning of the row.
   * The props for the icon or avatar are passed as an object via the graphicsProps.
   */
  @Prop() optionsVariant: DropdownVariant = 'standard';
  /**
   * Allow to search for value. Default is true.
   */
  @Prop() searchable = true;
  /**
   * The data for the select component, the options will be of type array of fw-select-options.
   */
  @Prop() options: any;
  /**
   * Place a checkbox.
   */
  @Prop() checkbox = false;
  /**
   * Default option to be shown if the option doesn't match the filterText.
   */
  // @i18n({ keyName: 'search.noItemsFound' })
  @Prop({ mutable: true })
  notFoundText = '';
  /**
   * Filter function which takes in filterText and dataSource and return a Promise.
   * Where filter text is the text to filter the value in dataSource array.
   * The returned promise should contain the array of options to be displayed.
   */
  @Prop() search;
  /**
   * Text to be displayed when there is no data available in the select.
   */
  // @i18n({ keyName: 'search.noDataAvailable' })
  @Prop({ mutable: true })
  noDataText = '';
  /**
   * Debounce timer for the search promise function.
   */
  @Prop() debounceTimer = 300;
  /**
   * Array of the options that is displayed as the default selection, in the list box. Must be a valid option corresponding to the fw-select-option components used in Select.
   */
  @Prop({ reflect: true, mutable: true }) selectedOptions = [];
  /**
   * Whether the select width to be same as that of the options.
   */
  @Prop() sameWidth = true;
  /**
   * Placement of the options list with respect to select.
   */
  @Prop() optionsPlacement: PopoverPlacementType = 'bottom';
  /**
   * Alternative placement for popover if the default placement is not possible.
   */
  @Prop() fallbackPlacements: [PopoverPlacementType] = ['top'];
  /**
   * The variant of tag to be used.
   */
  @Prop() tagVariant: TagVariant = 'standard';
  /**
   * Whether the arrow/caret should be shown in the select.
   */
  @Prop({ mutable: true }) caret = true;
  /**
   * If the default label prop is not used, then use this prop to pass the id of the label.
   */
  @Prop() labelledBy = '';
  /**
   * Whether clicking on the already selected option disables it.
   */
  @Prop() allowDeselect = true;
  /**
   * Hint text displayed below the text box.
   */
  @Prop() hintText = '';
  /**
   * Warning text displayed below the text box.
   */
  @Prop() warningText = '';
  /**
   * Error text displayed below the text box.
   */
  @Prop() errorText = '';
  /**
   * Describes the select's boundary HTMLElement
   */
  @Prop({ mutable: true }) boundary: HTMLElement;
  /**
   * Props to be passed for creatable select
   * isCreatable: boolean - If true, select accepts user input that are not present as options and add them as options
   * validateNewOption: (value) => boolean - If passed, this function will determine the error state for every new option entered. If return value is true, error state of the newly created option will be false and if return value is false, then the error state of the newly created option will be true.
   * formatCreateLabel: (label) => string - Gets the label for the "create new ..." option in the menu. Current input value is provided as argument.
   */
  @Prop() creatableProps = {
    isCreatable: false,
    validateNewOption: (_value): boolean => true,
    formatCreateLabel: (label): string => label,
  };

  /**
   *  Option to prevent the select options from being clipped when the component is placed inside a container with
   * `overflow: auto|hidden|scroll`.
   */
  @Prop() hoist = false;

  /**
   *  Key for determining the label for a given option
   */
  @Prop() optionLabelPath = 'text';

  /**
   *  Key for determining the value for a given option
   */
  @Prop() optionValuePath = 'value';

  /**
   *  Sets the max height of select with multiple options selected and displays a scroll when maxHeight value is exceeded
   */
  @Prop() maxHeight = 'none';

  /**
   *  Props to be passed for fw-tag components displayed in multi-select.
   */
  @Prop() tagProps = {};

  /**
   *  Virtualize long list of elements in list options *Experimental*
   */
  @Prop() enableVirtualScroll = false;

  /**
   *  Works only when 'enableVirtualScroll' is true. Estimated size of each item in the list box to ensure smooth-scrolling.
   */
  @Prop() estimatedSize = 35;

  // Events
  /**
   * Triggered when a value is selected or deselected from the list box options.
   */
  @Event() fwChange: EventEmitter;
  /**
   * Triggered when the list box comes into focus.
   */
  @Event() fwFocus: EventEmitter;
  /**
   * Triggered when the list box loses focus.
   */
  @Event() fwBlur: EventEmitter;

  @Listen('fwHide')
  onDropdownClose(e) {
    if (e.composedPath()[0].id === 'select-popover') {
      this.clearInput();
      this.isExpanded = false;
      this.multiple && this.selectInput?.focus();
    }
  }

  @Listen('fwShow')
  onDropdownOpen(e) {
    if (e.composedPath()[0].id === 'select-popover') {
      this.isExpanded = true;
    }
  }

  @Listen('fwLoading')
  onLoading(event) {
    this.isLoading = event.detail.isLoading;
    if (['search', 'mail'].includes(this.variant) && !this.isLoading) {
      this.selectInput?.value?.trim() && this.openDropdown();
    }
  }

  @Listen('fwChange')
  fwSelectedHandler(selectedItem) {
    if (selectedItem.composedPath()[0].tagName === 'FW-LIST-OPTIONS') {
      this.selectedOptionsState = selectedItem.detail?.meta?.selectedOptions;
      this.value = selectedItem.detail.value;
      this.renderInput();
      if (!this.multiple || ['search', 'mail'].includes(this.variant)) {
        this.closeDropdown();
      }
      selectedItem.stopImmediatePropagation();
      selectedItem.stopPropagation();
      selectedItem.preventDefault();
      if (this.selectedOptionsState?.length > 0) {
        this.fwChange.emit({
          name: this.name,
          value: this.value,
          meta: { selectedOptions: this.selectedOptionsState },
        });
      } else {
        this.fwChange.emit({
          name: this.name,
          value: this.value,
          meta: {
            shouldValidate: false, // for handling validation with form during reset. watcher in list-options is firing.
            selectedOptions: this.selectedOptionsState,
          },
        });
      }
    }
  }

  // Listen to Tag close in case of multi-select
  @Listen('fwClosed')
  fwCloseHandler(ev) {
    this.setSelectedOptions(
      this.selectedOptionsState?.filter((_, index) => index !== ev.detail.index)
    );
    this.focusOnTagContainer();
  }

  @Listen('keydown')
  onKeyDown(ev) {
    if (this.changeEmittable()) {
      switch (ev.key) {
        case 'ArrowDown':
          this.innerOnClick();
          this.fwListOptions.setFocus();
          ev.preventDefault();
          ev.stopPropagation();
          break;
        case 'Delete':
        case 'Backspace':
          if (!this.readonly && this.multiple) {
            this.deleteFocusedTags();
            if (
              this.focusedValues.length === 0 &&
              this.selectInput?.value === ''
            ) {
              this.focusOnTagContainer();
            }
          }
          break;
        case 'Escape':
          this.innerOnBlur(ev);
          this.closeDropdown();
          break;
        case 'Tab':
          this.focusedValues = [];
          this.closeDropdown();
          break;
        case 'a':
        case 'A':
          if (
            !this.readonly &&
            this.multiple &&
            (ev.ctrlKey || ev.metaKey) &&
            (!this.searchValue || this.focusedValues.length > 0)
          ) {
            ev.preventDefault();
            ev.stopPropagation();
            this.tagContainer?.focus();
            this.focusedValues = this.selectedOptionsState?.reduce(
              (arr, option, i) => (!option.disabled && arr.push(i), arr),
              []
            );
          }
          break;
      }
    }
  }

  @Listen('fwFocus')
  onOptionFocus(event) {
    if (event.composedPath()[0].tagName === 'FW-SELECT-OPTION') {
      this.focusedOptionId = event.detail.id;
    }
  }

  @Listen('fwBlur')
  onOptionBlur(event) {
    if (event.composedPath()[0].tagName === 'FW-SELECT-OPTION') {
      this.focusedOptionId = '';
    }
  }

  @Watch('dataSource')
  optionsChangedHandler() {
    this.renderInput();
  }

  @Watch('options')
  onOptionsChange(newValue) {
    const selectedValues = newValue?.filter((option) => option.selected);
    // If selected key is available in options schema use it
    // Or check for the value
    if (selectedValues?.length > 0) {
      this.selectedOptionsState = selectedValues;
      this.value = this.multiple
        ? this.selectedOptionsState.map((x) => x[this.optionValuePath])
        : this.selectedOptionsState[0]?.[this.optionValuePath];
      this.dataSource = newValue;
    } else if (this.valueExists()) {
      this.dataSource = newValue;
      // match value and selectedOptionsState with the updated options when value is already provided
      this.matchValueWithOptions();
    } else {
      this.value = this.multiple ? [] : '';
      this.selectedOptionsState = [];
      this.dataSource = newValue;
    }
  }

  // Watcher to update selected options state on selectedOptions prop update
  @Watch('selectedOptions')
  onSelectedOptionsChange(newValue) {
    this.setSelectedOptions(newValue);
  }

  @Method()
  async getSelectedItem(): Promise<any> {
    return this.fwListOptions?.getSelectedOptions();
  }

  @Method()
  async setSelectedValues(values: string | string[]): Promise<any> {
    this.fwListOptions?.setSelectedValues(values);
    this.renderInput();
  }

  @Method()
  async setSelectedOptions(options: any[]): Promise<any> {
    this.fwListOptions?.setSelectedOptions(options);
    this.renderInput();
  }

  @Method()
  async setFocus(): Promise<any> {
    this.hasFocus = true;
    this.selectInput?.focus();
  }

  /**
   * Shows the dropdown panel
   */
  @Method()
  async showDropdown(): Promise<any> {
    this.openDropdown();
  }

  /**
   * Hides the dropdown panel
   */
  @Method()
  async hideDropdown(): Promise<any> {
    this.closeDropdown();
  }

  matchValueWithOptions = () => {
    if (this.dataSource?.length > 0) {
      // Check whether the selected data in the this.dataSource  matches the value
      const selectedDataSource = this.dataSource.filter((option) =>
        this.isValueEqual(this.value, option)
      );
      const selectedDataSourceValues = selectedDataSource.map(
        (option) => option[this.optionValuePath]
      );
      const selected = this.multiple
        ? selectedDataSourceValues
        : selectedDataSourceValues[0];
      if (!isEqual(this.value, selected)) {
        if (selected) {
          this.value = selected;
        } else {
          this.value = this.multiple ? [] : '';
        }
      }
      if (
        JSON.stringify(this.selectedOptionsState) !==
        JSON.stringify(selectedDataSource)
      ) {
        this.selectedOptionsState = selectedDataSource;
      }
    } else {
      this.value = this.multiple ? [] : '';
    }
    this.renderInput();
  };

  tagContainerKeyDown = (ev) => {
    if (this.changeEmittable()) {
      switch (ev.key) {
        case 'Escape':
          this.innerOnBlur(ev);
          this.closeDropdown();
          break;
        case 'Delete':
        case 'Backspace':
          this.deleteFocusedTags();
          break;
        case 'ArrowLeft':
          if (this.focusedValues?.length === 0) {
            this.focusOnTagContainer();
          } else if (this.tagArrowKeyCounter - 1 >= 0) {
            // should not focus disabled tag
            if (
              !this.selectedOptionsState[this.tagArrowKeyCounter - 1]?.disabled
            ) {
              this.tagArrowKeyCounter--;
              this.focusOnTag(this.tagArrowKeyCounter);
            }
          } else {
            this.tagArrowKeyCounter = 0;
          }
          ev.preventDefault();
          ev.stopPropagation();
          ev.stopImmediatePropagation();
          break;
        case 'ArrowRight':
          if (this.tagArrowKeyCounter + 1 >= this.value?.length) {
            this.selectInput?.focus();
          } else if (this.tagArrowKeyCounter <= this.value?.length) {
            this.tagArrowKeyCounter++;
            this.focusOnTag(this.tagArrowKeyCounter);
          }
          ev.preventDefault();
          ev.stopPropagation();
          ev.stopImmediatePropagation();
          break;
      }
    }
  };

  deleteFocusedTags() {
    if (this.focusedValues.length > 0) {
      // delete focused values
      this.setSelectedOptions(
        this.selectedOptionsState?.filter(
          (_, index) => !this.focusedValues.includes(index)
        )
      );
      // reset focused values
      this.focusedValues = [];
    }
  }

  focusOnTagContainer() {
    if (
      Array.isArray(this.value) &&
      !this.selectedOptionsState[this.value?.length - 1]?.disabled
    ) {
      this.tagArrowKeyCounter = this.value?.length - 1;
      this.focusOnTag(this.tagArrowKeyCounter);
    }
  }

  focusOnTag(index) {
    if (!this.selectedOptionsState[index]?.disabled) {
      this.focusedValues = [index];
      this.tagContainer.focus();
      const tags = this.tagContainer.querySelectorAll('fw-tag');
      [...tags][index].scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }

  clearInput() {
    if (!this.multiple && this.value) {
      this.renderInput();
      return;
    }
    this.searchValue = '';
    if (this.selectInput) {
      this.selectInput.value = '';
    }
  }

  isValueEqual(value, option) {
    return this.multiple
      ? value.includes(option[this.optionValuePath])
      : value === option[this.optionValuePath];
  }

  valueExists() {
    return (
      this.value && (this.multiple ? this.value?.length > 0 : !!this.value)
    );
  }

  onInput() {
    if (this.changeEmittable()) {
      this.searchValue = this.selectInput?.value;
      if (this.selectInput?.value) {
        !['search', 'mail'].includes(this.variant) && this.openDropdown();
      } else {
        // Clear selected value in case of single select.
        this.multiple || this.setSelectedValues('');
        ['search', 'mail'].includes(this.variant) && this.closeDropdown();
      }
      this.focusedValues = [];
    }
  }

  onClickTag(e, index) {
    if (this.changeEmittable()) {
      e.stopPropagation();
      this.tagContainer.focus();
      e.currentTarget.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
      if (!this.selectedOptionsState[index]?.disabled) {
        const focusedIndex = this.focusedValues.indexOf(index);
        if (focusedIndex === -1) {
          if (e.ctrlKey || e.metaKey) {
            // Add indices to focusedValues if ctrl or cmd key is held down
            this.focusedValues = [...this.focusedValues, index];
          } else if (e.shiftKey && this.focusedValues.length > 0) {
            // Select range of indices to be focused if shift key is held down
            const startIndex =
              this.focusedValues[this.focusedValues.length - 1];
            const endIndex = index > startIndex ? index + 1 : index - 1;
            this.focusedValues = uniq([
              ...this.focusedValues,
              ...range(startIndex, endIndex),
            ]);
          } else {
            // Clicking on a tag without ctrl/cmd/shift key held down should focus a single index
            this.focusedValues = [index];
          }
        } else if (e.ctrlKey || e.metaKey) {
          // Remove index from focusedValues if already present and ctrl or cmd key is held down
          this.focusedValues = this.focusedValues.filter(
            (_, index) => index !== focusedIndex
          );
        } else if (!e.shiftKey) {
          // Highlight current index alone if ctrl/cmd/shift key is not held down
          this.focusedValues = [index];
        }
      }
    }
  }

  renderTags() {
    if (this.multiple && Array.isArray(this.value)) {
      return this.selectedOptionsState?.map((option, index) => {
        if (this.isValueEqual(this.value, option)) {
          const optionState =
            option.error || (this.variant === 'mail' && index >= this.max)
              ? 'error'
              : 'normal';
          const className =
            this.disabled || option.disabled ? 'tag-disabled' : 'tag-clickable';
          const displayAttributes =
            this.variant === 'mail'
              ? {
                  text: option[this.optionValuePath],
                  showEllipsisOnOverflow: true,
                  class: className + ' bold-tag',
                }
              : {
                  text: option[this.optionLabelPath],
                  subText: option.subText,
                };
          return (
            <fw-tag
              index={index}
              class={className}
              state={optionState}
              variant={this.tagVariant}
              graphicsProps={option.graphicsProps}
              disabled={this.disabled || option.disabled}
              value={option[this.optionValuePath]}
              focusable={false}
              closable={!this.disabled && !option.disabled}
              isFocused={this.focusedValues.includes(index)}
              onClick={(e) => this.onClickTag(e, index)}
              {...displayAttributes}
              {...this.tagProps}
            />
          );
        }
      });
    }
  }

  renderButtonValue() {
    if (
      this.tagVariant === 'avatar' &&
      this.selectedOptionsState[0]?.[this.optionValuePath]
    ) {
      return (
        <fw-tag
          class='display-tag'
          state='transparent'
          variant='avatar'
          graphicsProps={this.selectedOptionsState[0]?.graphicsProps}
          text={this.selectedOptionsState[0]?.[this.optionLabelPath]}
          subText={
            this.selectedOptionsState[0]?.subText
              ? `<${this.selectedOptionsState[0]?.subText}>`
              : ''
          }
          disabled={this.selectedOptionsState[0]?.disabled}
          value={this.selectedOptionsState[0]?.[this.optionValuePath]}
          focusable={false}
          closable={false}
          showEllipsisOnOverflow
        />
      );
    } else {
      return this.value;
    }
  }

  renderInput() {
    if (this.selectedOptionsState?.length > 0) {
      if (this.selectInput) {
        this.selectInput.value = '';
        this.selectInput.value = this.multiple
          ? this.selectInput.value
          : this.selectedOptionsState[0][this.optionLabelPath] || '';
      }
    } else {
      if (this.selectInput) {
        this.selectInput.value = '';
      }
    }
  }

  renderSelectInput() {
    return (
      <input
        ref={(selectInput) => (this.selectInput = selectInput)}
        class={{
          'multiple-select': this.multiple,
        }}
        autoComplete='off'
        disabled={this.disabled}
        name={this.name}
        id={this.name}
        placeholder={this.valueExists() ? '' : this.placeholder || ''}
        readOnly={this.readonly}
        required={this.required}
        type={this.type}
        value=''
        aria-autocomplete='list'
        aria-activedescendant={this.focusedOptionId}
        onInput={() => this.onInput()}
        onFocus={(e) => this.innerOnFocus(e)}
        onBlur={(e) => this.innerOnBlur(e)}
        aria-invalid={this.state === 'error'}
        aria-describedby={`hint-${this.name} error-${this.name}`}
        onPaste={(e) => this.onPaste(e)}
        aria-disabled={this.disabled}
      />
    );
  }

  onClickOutside(e) {
    if (
      !e.composedPath().includes(this.host) &&
      this.focusedValues.length > 0
    ) {
      this.focusedValues = [];
    }
  }

  componentWillLoad() {
    this.boundary ||= this.host.parentElement;
    this.checkSlotContent();
    if (this.variant === 'mail') {
      this.caret = false;
      this.multiple = true;
    }

    //TODO: The below is a rough draft and needs to be optimized for better performance.
    const selectOptions = Array.from(
      this.host.querySelectorAll('fw-select-option')
    );

    // Set value if the selectedOptions is provided
    if (this.selectedOptions?.length > 0) {
      this.selectedOptionsState = this.selectedOptions;
      this.value = this.multiple
        ? this.selectedOptions.map((option) => option[this.optionValuePath])
        : this.selectedOptions[0][this.optionValuePath];
    }

    if (this.multiple) {
      if (this.multiple && typeof this.value === 'string') {
        throw Error('value must be a array of string when multiple is true');
      }
      this.value = this.value?.length > 0 ? this.value : [];
    } else {
      this.value = this.value ? this.value : '';
    }

    const options = selectOptions.map((option) => {
      return {
        html: option.html,
        [this.optionLabelPath]: option.html
          ? option.optionText
          : option.textContent,
        [this.optionValuePath]: option.value,
        selected: this.isValueEqual(this.value, option) || option.selected,
        disabled: option.disabled,
        htmlContent: option.html ? option.innerHTML : '',
      };
    });
    this.dataSource = options.length === 0 ? this.options : options;
    // Set selectedOptions if the value is provided
    if (!this.multiple && this.value && this.selectedOptions?.length === 0) {
      this.selectedOptionsState = this.dataSource?.filter(
        (option) => this.value === option[this.optionValuePath]
      );
    } else if (
      this.multiple &&
      this.value?.length !== this.selectedOptions?.length
    ) {
      this.selectedOptionsState = this.dataSource?.filter((option) =>
        this.isValueEqual(this.value, option)
      );
    }
    if (this.dataSource?.length > 0) {
      // Check whether the selected data in the this.dataSource  matches the value
      const selectedDataSource = this.dataSource.filter(
        (option) => option.selected
      );
      const selectedDataSourceValues = selectedDataSource.map(
        (option) => option[this.optionValuePath]
      );
      const selected = this.multiple
        ? selectedDataSourceValues
        : selectedDataSourceValues[0];
      if (
        selectedDataSourceValues.length > 0 &&
        JSON.stringify(this.value) !== JSON.stringify(selected)
      ) {
        this.value = selected;
        this.selectedOptionsState = selectedDataSource;
      }
    }
    this.host.addEventListener('focus', this.setFocus);
    //this.host.innerHTML = '';

    //Get id
    this.hostId = this.host.id || '';

    // Add event listener to track clicks outside the element to blur selected tags
    document.addEventListener('mouseup', this.onClickOutside.bind(this));
  }

  componentDidLoad() {
    this.renderInput();
  }

  disconnectedCallback() {
    this.host.removeEventListener('focus', this.setFocus);
    document.removeEventListener('mouseup', this.onClickOutside.bind(this));
  }

  @Watch('isExpanded')
  expandWatcher(expanded: boolean): void {
    if (this.variant === 'button') {
      const icon = this.host.shadowRoot
        ?.querySelector('.select-container')
        ?.querySelector('fw-button')
        ?.shadowRoot?.querySelector('fw-icon');
      icon && (icon.name = expanded ? 'chevron-up' : 'chevron-down');
    }
  }

  checkSlotContent() {
    this.hasHintTextSlot = hasSlot(this.host, 'hint-text');
    this.hasWarningTextSlot = hasSlot(this.host, 'warning-text');
    this.hasErrorTextSlot = hasSlot(this.host, 'error-text');
  }

  getAriaDescribedBy(): string {
    if (this.state === 'normal') return `hint-${this.name}`;
    else if (this.state === 'error') return `error-${this.name}`;
    else if (this.state === 'warning') return `warning-${this.name}`;
    return null;
  }

  onPaste(e) {
    // Allow paste only if isCreatable is true
    if (this.creatableProps?.isCreatable) {
      // Get pasted data via clipboard API
      const clipboardData = e?.clipboardData || window['clipboardData'];
      const pastedData = clipboardData?.getData('Text');
      if (pastedData.includes('\n') || pastedData.includes(',')) {
        // Stop data actually being pasted into input
        e.stopPropagation();
        e.preventDefault();
        // Split strings either by new line or comma
        const values = pastedData.split(/[\n,]/);
        const valuesToBeInput = [];
        values.forEach((value) => {
          const sanitisedValue = value.trim();
          // Check value presence
          if (sanitisedValue) {
            valuesToBeInput.push({
              [this.optionLabelPath]: sanitisedValue,
              [this.optionValuePath]: sanitisedValue,
              error:
                typeof this.creatableProps?.validateNewOption === 'function'
                  ? !this.creatableProps?.validateNewOption(sanitisedValue)
                  : false,
            });
          }
        });
        // Sets the selected options with the custom data
        if (valuesToBeInput.length > 0) {
          this.setSelectedOptions([
            ...this.selectedOptionsState,
            ...valuesToBeInput,
          ]);
        }
      }
    }
  }

  render() {
    const { host, name, value } = this;

    renderHiddenField(host, name, value);

    const listAttributes = {
      ...this.creatableProps,
      ...(this.variant === 'mail' ? {} : { max: this.max }),
    };

    return (
      <FieldControl
        inputId={this.name}
        label={this.label}
        labelId={`${this.label}-${this.name}`}
        state={this.state}
        hintTextId={`hint-${this.name}`}
        hintText={this.hintText}
        hasHintTextSlot={this.hasHintTextSlot}
        errorTextId={`error-${this.name}`}
        errorText={this.errorText}
        hasErrorTextSlot={this.hasErrorTextSlot}
        warningTextId={`warning-${this.name}`}
        warningText={this.warningText}
        hasWarningTextSlot={this.hasWarningTextSlot}
        required={this.required}
      >
        <div
          aria-disabled={this.disabled}
          class={{
            'has-focus': this.hasFocus,
          }}
        >
          {/* NOTE:: aria-controls is added to div based on ARIA 1.0 but from ARIA 1.1 version this should be
        moved to the input REF- https://www.w3.org/TR/wai-aria-practices/examples/combobox/aria1.1pattern/listbox-combo.html */}
          <div
            class={{
              'select-container': true,
              [this.state]: true,
            }}
            role='combobox'
            aria-controls={`${this.hostId}-listbox`}
            aria-haspopup='listbox'
            aria-expanded={this.isExpanded}
            aria-owns={`${this.hostId}-listbox`}
          >
            <fw-popover
              id='select-popover'
              distance='8'
              trigger='manual'
              ref={(popoverRef) => (this.popoverRef = popoverRef)}
              sameWidth={this.sameWidth}
              placement={this.optionsPlacement}
              fallbackPlacements={this.fallbackPlacements}
              boundary={this.boundary}
              hoist={this.hoist}
            >
              <div
                slot='popover-trigger'
                class={{
                  'input-container': this.variant !== 'button',
                  [this.state]: true,
                  'select-disabled': this.disabled,
                  'button-container': this.variant === 'button',
                }}
                part='fw-select-input-container'
                onClick={() => this.innerOnClick()}
                onKeyDown={handleKeyDown(this.innerOnClick, true)}
              >
                {this.variant === 'button' ? (
                  <fw-button
                    style={{ '--fw-button-label-vertical-padding': '7px' }}
                    show-caret-icon
                    id={`${this.hostId}-btn`}
                    color={this.tagVariant === 'avatar' ? 'text' : 'secondary'}
                    class={
                      this.host.classList.value.includes('first')
                        ? 'fw-button-group__button--first'
                        : this.host.classList.value.includes('last')
                        ? 'fw-button-group__button--last'
                        : ''
                    }
                    aria-disabled={this.disabled}
                    disabled={this.disabled}
                  >
                    {this.renderButtonValue()}
                  </fw-button>
                ) : (
                  <Fragment>
                    <div class='input-container-inner'>
                      {this.multiple ? (
                        <div
                          class={`tag-container ${this.tagVariant}`}
                          onFocus={this.focusOnTagContainer}
                          ref={(tagContainer) =>
                            (this.tagContainer = tagContainer)
                          }
                          onKeyDown={this.tagContainerKeyDown}
                          tabIndex={-1}
                          style={{
                            'max-height': this.maxHeight,
                          }}
                        >
                          {this.renderTags()}
                          {this.renderSelectInput()}
                        </div>
                      ) : (
                        this.renderSelectInput()
                      )}
                    </div>
                    {this.isLoading ? (
                      <fw-spinner size='small'></fw-spinner>
                    ) : (
                      this.caret && (
                        <span
                          class={{
                            'dropdown-status-icon': true,
                            'expanded': this.isExpanded,
                            'disabled': this.disabled,
                          }}
                        >
                          <fw-icon
                            name='chevron-down'
                            size={8}
                            library='system'
                          ></fw-icon>
                        </span>
                      )
                    )}
                  </Fragment>
                )}
              </div>
              <fw-list-options
                ref={(fwListOptions) => (this.fwListOptions = fwListOptions)}
                id={`${this.hostId}-listbox`}
                role='listbox'
                aria-labelledby={this.labelledBy || `${this.hostId}-label`}
                notFoundText={
                  this.notFoundText ||
                  TranslationController.t('search.noItemsFound')
                }
                debounceTimer={this.debounceTimer}
                noDataText={
                  this.noDataText ||
                  TranslationController.t('search.noDataAvailable')
                }
                search={this.search}
                selectedOptions={this.selectedOptionsState}
                variant={this.optionsVariant}
                filter-text={this.searchValue}
                options={this.dataSource}
                value={this.value}
                multiple={this.multiple}
                disabled={this.disabled}
                checkbox={this.checkbox}
                allowDeselect={this.allowDeselect}
                slot='popover-content'
                optionLabelPath={this.optionLabelPath}
                optionValuePath={this.optionValuePath}
                enableVirtualScroll={this.enableVirtualScroll}
                estimatedSize={this.estimatedSize}
                exportparts='fw-list-options-container'
                {...listAttributes}
              ></fw-list-options>
            </fw-popover>
          </div>
        </div>
      </FieldControl>
    );
  }
}
