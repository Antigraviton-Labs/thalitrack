import sys
import re

file_path = r'd:\thalitrack-antigravity\src\app\dashboard\student\page.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add MessCard import
content = content.replace("import { useAuth } from '@/hooks';", "import { useAuth } from '@/hooks';\nimport { MessCard } from '@/components/ui';")

# 2. Add userLat, userLng states
old_state = "    const [sortBy, setSortBy] = useState<'nearest' | 'topRated' | 'lowestPrice'>('nearest');"
new_state = "    const [sortBy, setSortBy] = useState<'nearest' | 'topRated' | 'lowestPrice'>('nearest');\n    const [userLat, setUserLat] = useState<number | null>(null);\n    const [userLng, setUserLng] = useState<number | null>(null);"
content = content.replace(old_state, new_state)

# 3. Update fetchMesses signature and logic
old_fetch = """    const fetchMesses = useCallback(async (query?: string) => {
        setIsLoading(true);
        try {
            let url = '/api/messes?sortBy=rating&limit=20';
            if (query) {
                url += `&query=${encodeURIComponent(query)}`;
            }"""
new_fetch = """    const fetchMesses = useCallback(async (query?: string, customSortBy?: string, lat?: number, lng?: number) => {
        setIsLoading(true);
        try {
            const currentSort = customSortBy || sortBy;
            const sortParam = currentSort === 'nearest' ? 'distance' : currentSort === 'topRated' ? 'rating' : currentSort === 'lowestPrice' ? 'price' : 'rating';
            let url = `/api/messes?sortBy=${sortParam}&limit=20`;
            if (query) {
                url += `&query=${encodeURIComponent(query)}`;
            }
            if (lat && lng) {
                url += `&latitude=${lat}&longitude=${lng}`;
            }"""
content = content.replace(old_fetch, new_fetch)

# Update fetchMesses dependency
content = content.replace("} finally {\n            setIsLoading(false);\n        }\n    }, []);", "} finally {\n            setIsLoading(false);\n        }\n    }, [sortBy]);")

# 4. Update debounce call
old_debounce = """        debounceRef.current = setTimeout(() => {
            if (activeTab === 'discover') {
                fetchMesses(searchQuery || undefined);
            }
        }, 300);"""
new_debounce = """        debounceRef.current = setTimeout(() => {
            if (activeTab === 'discover') {
                fetchMesses(searchQuery || undefined, sortBy, userLat || undefined, userLng || undefined);
            }
        }, 300);"""
content = content.replace(old_debounce, new_debounce)

# 5. Geolocation fetch
old_init = """        if (!authLoading && token) {
            fetchMesses();
            fetchSavedMesses();
        }
    }, [authLoading, user, router, token, fetchMesses, fetchSavedMesses]);"""

new_init = """        if (!authLoading && token) {
            fetchSavedMesses();
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const { latitude, longitude } = position.coords;
                    setUserLat(latitude);
                    setUserLng(longitude);
                    setSortBy('nearest');
                    fetchMesses(undefined, 'nearest', latitude, longitude);
                },
                (error) => {
                    setSortBy('topRated');
                    fetchMesses(undefined, 'topRated');
                },
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
            );
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [authLoading, user, router, token, fetchSavedMesses]);"""
content = content.replace(old_init, new_init)

# 6. Delete inline MessCard
pattern = re.compile(r'    // Mess card component\n    const MessCard.*?    \);\n\n', re.DOTALL)
content = re.sub(pattern, '', content)

# 7. Update existing <MessCard key={mess._id} mess={mess} /> to pass isSaved
content = content.replace("<MessCard key={mess._id} mess={mess} />", "<MessCard key={mess._id} mess={mess as any} isSaved={savedMessIds.has(mess._id)} onSaveToggle={handleSaveMess} />")

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print('Done!')
