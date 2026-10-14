import React from 'react';
import { Smartphone, X, AlertCircle, Lock } from 'lucide-react';
import { useRecharge } from '../context/RechargeContext';

interface MobileNumberInputProps {
  error?: string;
  onErrorChange?: (error: string) => void;
}

export const MobileNumberInput: React.FC<MobileNumberInputProps> = ({
  error,
  onErrorChange,
}) => {
  const { selectedOperator, mobileNumber, setMobileNumber, validateMobileNumber } = useRecharge();
  const isLocked = !selectedOperator;

  // Format with a space in the middle for PhonePe style (e.g. 98765 43210)
  const formatDisplayNumber = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 10);
    if (digits.length > 5) {
      return `${digits.slice(0, 5)} ${digits.slice(5)}`;
    }
    return digits;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isLocked) return;

    const rawValue = e.target.value;
    const formatted = formatDisplayNumber(rawValue);
    setMobileNumber(formatted);

    if (onErrorChange) {
      if (formatted.replace(/\D/g, '').length === 10) {
        const { isValid, message } = validateMobileNumber(formatted);
        onErrorChange(isValid ? '' : message);
      } else if (error) {
        onErrorChange('');
      }
    }
  };

  const handleClear = () => {
    setMobileNumber('');
    if (onErrorChange) onErrorChange('');
  };

  const handleLockedClick = () => {
    if (isLocked && onErrorChange) {
      onErrorChange('Please select your SIM operator first.');
    }
  };

  return (
    <div className="relative">
      <div className="flex items-center justify-between mb-2.5">
        <label className="block text-xs sm:text-sm font-semibold text-[#151B2B]">
          Mobile number
        </label>
        {isLocked && (
          <span className="text-[11px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 flex items-center gap-1">
            <Lock className="w-3 h-3" />
            <span>Select SIM above to unlock</span>
          </span>
        )}
      </div>

      <div
        onClick={handleLockedClick}
        className={`flex items-center rounded-2xl border transition-all duration-200 overflow-hidden ${
          isLocked
            ? 'bg-slate-50/90 border-slate-200 cursor-not-allowed opacity-90'
            : error
            ? 'bg-white border-[#FF3448] ring-2 ring-red-100'
            : 'bg-white border-[#E7E8EF] focus-within:border-[#6426AD] focus-within:ring-2 focus-within:ring-purple-100'
        }`}
      >
        {/* +91 Country Code Prefix */}
        <div
          className={`flex items-center px-4 py-3.5 border-r border-[#E7E8EF] text-sm font-bold select-none ${
            isLocked ? 'bg-slate-100 text-slate-400' : 'bg-slate-50 text-[#151B2B]'
          }`}
        >
          +91
        </div>

        {/* Input Field */}
        <input
          type="tel"
          id="mobile-number-input"
          value={mobileNumber}
          onChange={handleChange}
          disabled={isLocked}
          placeholder={isLocked ? 'Select your SIM operator first' : 'Enter your 10-digit mobile number'}
          maxLength={11} // 10 digits + 1 space
          className={`w-full px-3.5 py-3.5 text-base sm:text-lg font-semibold tracking-wider placeholder:font-normal focus:outline-none bg-transparent ${
            isLocked
              ? 'text-slate-400 placeholder:text-slate-400 cursor-not-allowed text-sm sm:text-base'
              : 'text-[#151B2B] placeholder:text-slate-300'
          }`}
        />

        {/* Clear Button */}
        {!isLocked && mobileNumber && (
          <button
            type="button"
            onClick={handleClear}
            className="p-1.5 mr-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
            title="Clear number"
            aria-label="Clear mobile number"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {/* Right Status Icon */}
        <div className="p-3 mr-1 text-slate-400 flex items-center justify-center">
          {isLocked ? (
            <Lock className="w-5 h-5 text-slate-400" />
          ) : (
            <Smartphone className="w-5 h-5 text-[#6426AD]" />
          )}
        </div>
      </div>

      {/* Inline Validation Error */}
      {error && (
        <div className="flex items-center gap-1.5 mt-2 text-xs font-semibold text-[#FF3448] animate-in fade-in slide-in-from-top-1 duration-200">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};
