'use client';

import { useState } from 'react';

interface StarRatingProps {
    rating: number;
    onRate?: (rating: number) => void;
    readonly?: boolean;
    size?: 'sm' | 'md' | 'lg';
}

export default function StarRating({
    rating,
    onRate,
    readonly = false,
    size = 'md',
}: StarRatingProps) {
    const [hoverRating, setHoverRating] = useState(0);

    const sizes = {
        sm: 'text-lg',
        md: 'text-2xl',
        lg: 'text-3xl',
    };

    const handleClick = (value: number) => {
        if (!readonly && onRate) {
            onRate(value);
        }
    };

    return (
        <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((star) => {
                const isFilled = star <= (hoverRating || rating);
                return (
                    <button
                        key={star}
                        type="button"
                        onClick={() => handleClick(star)}
                        onMouseEnter={() => !readonly && setHoverRating(star)}
                        onMouseLeave={() => !readonly && setHoverRating(0)}
                        disabled={readonly}
                        className={`${sizes[size]} transition-all ${readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110'
                            }`}
                        aria-label={`Rate ${star} stars`}
                    >
                        <span className={isFilled ? 'text-yellow-500' : 'text-gray-300'}>
                            ★
                        </span>
                    </button>
                );
            })}
        </div>
    );
}
