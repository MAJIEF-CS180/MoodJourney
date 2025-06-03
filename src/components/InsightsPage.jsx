import React, { useState, useEffect, useMemo } from 'react';
import {
    Box, Button, Paper, Typography, Switch, FormControlLabel, Select, MenuItem,
    FormControl, InputLabel, Card, CardActionArea, CardContent, Grid, Tooltip as MuiTooltip, IconButton,
    Divider // Added Divider import
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import InfoIcon from '@mui/icons-material/Info';
import VisibilityIcon from '@mui/icons-material/Visibility';
import CloseIcon from '@mui/icons-material/Close';
import ArticleIcon from '@mui/icons-material/Article';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { scrollbarStyles, formatDate, getMainContent, extractEmotionFromContent, getEmotionColor } from '../utils';

function InsightsPage({ entries, onBack, handleEntrySelect }) {
    const theme = useTheme(); // Using useTheme as it's standard practice within components
    const [insightsViewMode, setInsightsViewMode] = useState("Informative");
    const [calendarGranularity, setCalendarGranularity] = useState("month");
    const [currentDisplayYear, setCurrentDisplayYear] = useState(new Date().getFullYear());
    const [currentDisplayMonth, setCurrentDisplayMonth] = useState(new Date().getMonth());
    const [selectedInsightEntry, setSelectedInsightEntry] = useState(null);

    const dayAbbreviations = useMemo(() => ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"], []);
    const monthNames = useMemo(() => ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"], []);

    const availableYears = useMemo(() => {
        const entryYears = new Set(entries.map(entry => new Date(entry.date.includes('T') ? entry.date : entry.date + 'T00:00:00').getFullYear()));
        const currentSystemYear = new Date().getFullYear();
        entryYears.add(currentSystemYear);
        if (entryYears.size === 0) return [currentSystemYear];
        const sortedYears = Array.from(entryYears).sort((a, b) => a - b);
        const minDataYear = sortedYears[0];
        const maxDataYear = sortedYears[sortedYears.length - 1];
        const startRange = Math.min(minDataYear, currentSystemYear - 3);
        const endRange = Math.max(maxDataYear, currentSystemYear + 3);
        const yearOptions = [];
        for (let y = startRange; y <= endRange; y++) yearOptions.push(y);
        return yearOptions.length > 0 ? yearOptions : [currentSystemYear];
    }, [entries]);

    useEffect(() => {
        if (availableYears.length > 0 && !availableYears.includes(currentDisplayYear)) {
            const currentSystemYear = new Date().getFullYear();
            setCurrentDisplayYear(availableYears.includes(currentSystemYear) ? currentSystemYear : availableYears[availableYears.length - 1]);
        }
    }, [availableYears, currentDisplayYear]);

    useEffect(() => {
        setSelectedInsightEntry(null);
    }, [insightsViewMode]);

    const entriesByDate = useMemo(() => {
        const map = new Map();
        entries.forEach(entry => map.set(entry.date, entry));
        return map;
    }, [entries]);

    const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
    const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

    const emotionCounts = useMemo(() => {
        const counts = { sadness: 0, angry: 0, neutral: 0, joy: 0, disgust: 0, fear: 0, surprise: 0, unknown: 0 };
        entries.forEach(entry => {
            const extractedEmotion = extractEmotionFromContent(entry.content)?.toLowerCase();
            let targetKey = extractedEmotion === "anger" ? "angry" : extractedEmotion;
            if (targetKey && counts.hasOwnProperty(targetKey)) counts[targetKey]++;
            else if (extractedEmotion) counts.unknown++;
            else counts.unknown++;
        });
        return counts;
    }, [entries]);

    const getEntryPreview = (content) => {
        const main = getMainContent(content);
        const lines = main.split('\n');
        return lines.slice(0, 5).join('\n') + (lines.length > 5 ? '...' : '');
    };

    const EmotionSummaryList = () => {
        const orderedEmotionKeys = ['angry', 'disgust', 'fear', 'joy', 'neutral', 'sadness', 'surprise'];
        const hasAnyCountGreaterThanZero =
            orderedEmotionKeys.some(key => emotionCounts[key] > 0) ||
            (emotionCounts.unknown && emotionCounts.unknown > 0);

        return (
            <Box sx={{ p: theme.spacing(1.5) }}>
                {orderedEmotionKeys.map((emotionKey) => {
                    const count = emotionCounts[emotionKey] || 0;
                    let displayName = emotionKey.charAt(0).toUpperCase() + emotionKey.slice(1);
                    if (emotionKey === 'angry') displayName = 'Anger';

                    const emotionDisplayColor = getEmotionColor(emotionKey, theme);

                    return (
                        <Box key={emotionKey} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1, p: 1, borderRadius: '8px', background: alpha(emotionDisplayColor, 0.15) }}>
                            <Typography variant="body1" sx={{ textTransform: 'capitalize', color: emotionDisplayColor }}>{displayName}</Typography>
                            <Typography variant="body1" sx={{ fontWeight: 'bold', color: emotionDisplayColor }}>{count}</Typography>
                        </Box>
                    );
                })}

                {emotionCounts.unknown > 0 && (
                    <Box key="unknown" sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1, p: 1, borderRadius: '8px', background: alpha(getEmotionColor("unknown", theme), 0.1) }}>
                        <Typography variant="body1" sx={{ textTransform: 'capitalize', color: getEmotionColor("unknown", theme) }}>Unknown</Typography>
                        <Typography variant="body1" sx={{ fontWeight: 'bold', color: getEmotionColor("unknown", theme) }}>{emotionCounts.unknown}</Typography>
                    </Box>
                )}

                {entries.length > 0 && !hasAnyCountGreaterThanZero && (
                    <Typography sx={{ textAlign: 'center', mt: 1 }} color="text.secondary">
                        No categorized emotions.
                    </Typography>
                )}
                {entries.length === 0 && (
                    <Typography sx={{ textAlign: 'center', mt: 1 }} color="text.secondary">
                        No data for summary.
                    </Typography>
                )}
            </Box>
        );
    };

    const renderDayCell = (dateStr, dayNumber, entryForDay) => {
        const rawEmotion = entryForDay ? extractEmotionFromContent(entryForDay.content) : null;
        const squareColor = rawEmotion ? getEmotionColor(rawEmotion, theme) : (entryForDay ? (theme.palette.mode === 'light' && theme.palette.primary.main === '#DAA520' ? alpha(theme.palette.secondary.main, 0.5) : theme.palette.grey[700]) : alpha(theme.palette.background.paper, 0.8));
        let displayEmotionText = rawEmotion || (entryForDay ? "Unknown" : "No Entry");
        if (rawEmotion?.toLowerCase() === 'anger' || rawEmotion?.toLowerCase() === 'angry') displayEmotionText = 'Anger';

        return (
            <MuiTooltip
                key={dateStr}
                title={<><Typography variant="caption" display="block" sx={{ fontWeight: 'bold' }}>{formatDate(dateStr)}</Typography>{entryForDay && <Typography variant="caption" display="block" sx={{ textTransform: 'capitalize' }}>{displayEmotionText}</Typography>}</>}
                arrow
                placement="top"
            >
                <Box
                    onClick={() => entryForDay && setSelectedInsightEntry(entryForDay)}
                    sx={{
                        aspectRatio: '1 / 1',
                        bgcolor: squareColor,
                        border: entryForDay ? 'none' : `1px solid ${theme.palette.divider}`,
                        borderRadius: '4px',
                        cursor: entryForDay ? 'pointer' : 'default',
                        transition: 'transform 0.1s ease-out, box-shadow 0.1s ease-out',
                        '&:hover': entryForDay ? { transform: 'scale(1.05)', boxShadow: theme.shadows[4] } : {},
                        display: 'flex',
                        alignItems: 'flex-start',
                        justifyContent: 'flex-start',
                        p: 0.5,
                        position: 'relative',
                        opacity: entryForDay ? 1 : 0.7,
                    }}
                >
                    <Typography variant="caption" sx={{
                        fontSize: '0.6rem',
                        color: entryForDay ? (theme.palette.getContrastText(squareColor) === '#000000' ? theme.palette.text.primary : theme.palette.getContrastText(squareColor)) : theme.palette.text.secondary,
                        lineHeight: 1,
                    }}>
                        {dayNumber}
                    </Typography>
                </Box>
            </MuiTooltip>
        );
    };

    const renderDayHeaders = () => (
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: theme.spacing(0.75), p: `${theme.spacing(0.25)} ${theme.spacing(0.75)} 0 ${theme.spacing(0.75)}`, mb: 0.5 }}>
            {dayAbbreviations.map(day => (
                <Typography key={day} variant="caption" align="center" sx={{ fontWeight: 'bold', color: theme.palette.text.secondary }}>
                    {day}
                </Typography>
            ))}
        </Box>
    );

    return (
        <>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexShrink: 0 }}>
                <Button startIcon={<ArrowBackIcon />} onClick={onBack} variant="outlined">Back to Journal</Button>
                <Box>
                    <Button onClick={() => setInsightsViewMode("Informative")} variant={insightsViewMode === 'Informative' ? 'contained' : 'outlined'} startIcon={<InfoIcon />} sx={{ mr: 1 }}>Informative</Button>
                    <Button onClick={() => setInsightsViewMode("Visual")} variant={insightsViewMode === 'Visual' ? 'contained' : 'outlined'} startIcon={<VisibilityIcon />}>Visual</Button>
                </Box>
            </Box>

            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2, width: '100%', flexGrow: 1, overflow: 'hidden' }}>
                <Paper sx={{ p: 1, flex: { xs: '1 1 auto', md: '2 1 0%' }, minWidth: 0, borderRadius: '16px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    {insightsViewMode === "Informative" ? (
                        entries.length > 0 ? (
                            <Box sx={{ ...scrollbarStyles(theme), height: '100%' }}>
                                <Box sx={{ p: theme.spacing(1.5) }}>
                                    {entries.map(entry => {
                                        const rawEmotion = extractEmotionFromContent(entry.content);
                                        const cardEmotionColor = rawEmotion ? getEmotionColor(rawEmotion, theme) : theme.palette.text.disabled;
                                        let cardDisplayText = rawEmotion;
                                        if (rawEmotion?.toLowerCase() === 'anger' || rawEmotion?.toLowerCase() === 'angry') cardDisplayText = 'Anger';

                                        return (
                                            <Card
                                                key={entry.date}
                                                sx={{
                                                    width: '100%',
                                                    mb: 2,
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    borderLeft: `5px solid ${cardEmotionColor}`,
                                                    borderRadius: '8px',
                                                    '&:last-child': { mb: 0 },
                                                }}
                                            >
                                                <CardActionArea onClick={() => setSelectedInsightEntry(entry)} sx={{ flexGrow: 1 }}>
                                                    <CardContent sx={{ p: 2, display: 'flex', flexDirection: 'column', flexGrow: 1, height: '100%' }}>
                                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                                                            <Typography
                                                                variant="subtitle1"
                                                                color="text.secondary"
                                                                sx={{ fontSize: theme.typography.pxToRem(18), fontWeight: 'bold' }}
                                                            >
                                                                {formatDate(entry.date)}
                                                            </Typography>
                                                            {cardDisplayText && (
                                                                <Box sx={{
                                                                    bgcolor: cardEmotionColor,
                                                                    color: theme.palette.getContrastText(cardEmotionColor),
                                                                    py: theme.spacing(0.75),
                                                                    px: theme.spacing(2),
                                                                    borderRadius: '8px',
                                                                    display: 'inline-flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center',
                                                                    minWidth: '80px',
                                                                }}>
                                                                    <Typography
                                                                        variant="body2"
                                                                        sx={{ fontWeight: 'bold', textTransform: 'capitalize', lineHeight: '1.3' }}
                                                                    >
                                                                        {cardDisplayText}
                                                                    </Typography>
                                                                </Box>
                                                            )}
                                                        </Box>

                                                        <Typography
                                                            variant="body1"
                                                            sx={{
                                                                fontSize: theme.typography.pxToRem(17),
                                                                lineHeight: 1.6,
                                                                display: '-webkit-box',
                                                                WebkitLineClamp: 5,
                                                                WebkitBoxOrient: 'vertical',
                                                                overflow: 'hidden',
                                                                textOverflow: 'ellipsis',
                                                                minHeight: '8em',
                                                            }}
                                                        >
                                                            {getEntryPreview(entry.content)}
                                                        </Typography>
                                                    </CardContent>
                                                </CardActionArea>
                                            </Card>
                                        );
                                    })}
                                </Box>
                            </Box>
                        ) : <Typography sx={{ textAlign: 'center', mt: 3 }}>No journal entries to display.</Typography>
                    ) : (
                        <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
                            <Box sx={{
                                p: 1,
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                flexWrap: 'wrap',
                                borderBottom: `1px solid ${theme.palette.divider}`,
                                mb: 1,
                                flexShrink: 0
                            }}>
                                <Typography variant="h6" component="div" sx={{ fontWeight: 'bold', color: theme.palette.text.primary }}>
                                    {calendarGranularity === "month"
                                        ? `${monthNames[currentDisplayMonth]} ${currentDisplayYear}`
                                        : `${currentDisplayYear}`
                                    }
                                </Typography>
                                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                                    <FormControlLabel control={<Switch checked={calendarGranularity === "year"} onChange={(e) => setCalendarGranularity(e.target.checked ? "year" : "month")} />} label={calendarGranularity === "year" ? "Year View" : "Month View"} sx={{ mr: 1 }} />
                                    {calendarGranularity === "month" && (
                                        <FormControl size="small" sx={{ minWidth: 130 }}>
                                            <InputLabel id="month-select-label">Month</InputLabel>
                                            <Select labelId="month-select-label" value={currentDisplayMonth} label="Month" onChange={(e) => setCurrentDisplayMonth(parseInt(e.target.value))} MenuProps={{ PaperProps: { sx: { maxHeight: 200 } } }}>
                                                {monthNames.map((name, index) => <MenuItem key={index} value={index}>{name}</MenuItem>)}
                                            </Select>
                                        </FormControl>
                                    )}
                                    <FormControl size="small" sx={{ minWidth: 100 }}>
                                        <InputLabel id="year-select-label">Year</InputLabel>
                                        <Select labelId="year-select-label" value={currentDisplayYear} label="Year" onChange={(e) => setCurrentDisplayYear(parseInt(e.target.value))} MenuProps={{ PaperProps: { sx: { maxHeight: 200 } } }}>
                                            {availableYears.map(y => <MenuItem key={y} value={y}>{y}</MenuItem>)}
                                        </Select>
                                    </FormControl>
                                </Box>
                            </Box>

                            <Box sx={{ flexGrow: 1, ...scrollbarStyles(theme), p: `${theme.spacing(0.25)} ${theme.spacing(0.75)} ${theme.spacing(0.75)} ${theme.spacing(0.75)}` }}>
                                {calendarGranularity === "month" && (
                                    <>
                                        {renderDayHeaders()}
                                        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: theme.spacing(0.75), alignContent: 'flex-start' }}>
                                            {(() => {
                                                const daysInMonth = getDaysInMonth(currentDisplayYear, currentDisplayMonth);
                                                const firstDayOffset = getFirstDayOfMonth(currentDisplayYear, currentDisplayMonth);
                                                const cells = [];
                                                for (let i = 0; i < firstDayOffset; i++) {
                                                    cells.push(<Box key={`empty-start-${i}`} sx={{ aspectRatio: '1 / 1', borderRadius: '4px', bgcolor: alpha(theme.palette.action.disabledBackground, 0.15) }} />);
                                                }
                                                for (let day = 1; day <= daysInMonth; day++) {
                                                    const dateStr = `${currentDisplayYear}-${String(currentDisplayMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                                                    cells.push(renderDayCell(dateStr, day, entriesByDate.get(dateStr)));
                                                }
                                                return cells;
                                            })()}
                                        </Box>
                                    </>
                                )}

                                {calendarGranularity === "year" && (
                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                        {monthNames.map((monthName, monthIndex) => (
                                            <Box key={monthIndex} sx={{ mb: 1 }}>
                                                <Typography variant="h6" component="div" sx={{ textAlign: 'center', mb: 0.5, fontWeight: 'medium', color: theme.palette.text.primary }}>
                                                    {monthName} {currentDisplayYear}
                                                </Typography>
                                                {renderDayHeaders()}
                                                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: theme.spacing(0.75), alignContent: 'flex-start' }}>
                                                    {(() => {
                                                        const daysInMonth = getDaysInMonth(currentDisplayYear, monthIndex);
                                                        const firstDayOffset = getFirstDayOfMonth(currentDisplayYear, monthIndex);
                                                        const cells = [];
                                                        for (let i = 0; i < firstDayOffset; i++) {
                                                            cells.push(<Box key={`empty-${monthIndex}-${i}`} sx={{ aspectRatio: '1 / 1', borderRadius: '4px', bgcolor: alpha(theme.palette.action.disabledBackground, 0.15) }} />);
                                                        }
                                                        for (let day = 1; day <= daysInMonth; day++) {
                                                            const dateStr = `${currentDisplayYear}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                                                            cells.push(renderDayCell(dateStr, day, entriesByDate.get(dateStr)));
                                                        }
                                                        return cells;
                                                    })()}
                                                </Box>
                                            </Box>
                                        ))}
                                    </Box>
                                )}
                            </Box>
                        </Box>
                    )}
                </Paper>
                <Paper sx={{
                    p: 1,
                    flex: { xs: '1 1 auto', md: '1 1 0%' },
                    minWidth: 0,
                    borderRadius: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    borderLeft: { md: `1px solid ${theme.palette.divider}` },
                }}>
                    <Box sx={{ flexShrink: 0, ...scrollbarStyles(theme) }}>
                        <EmotionSummaryList />
                    </Box>
                    <Divider sx={{ my: 1, flexShrink: 0 }} />
                    <Box sx={{
                        flexGrow: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'flex-end',
                        pt: theme.spacing(1.5),
                        pr: theme.spacing(1.5),
                        pb: theme.spacing(1.5),
                        pl: theme.spacing(1),
                        ...scrollbarStyles(theme),
                    }}>
                        {selectedInsightEntry ? (
                            <Paper variant="outlined" sx={{ p: 2, borderRadius: '8px', position: 'relative' }}>
                                <IconButton
                                    aria-label="close"
                                    onClick={() => setSelectedInsightEntry(null)}
                                    sx={{ position: 'absolute', right: 8, top: 8, color: (theme) => theme.palette.grey[500] }}
                                >
                                    <CloseIcon />
                                </IconButton>
                                <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
                                    {formatDate(selectedInsightEntry.date)}
                                </Typography>
                                {(() => {
                                    const rawEmotion = extractEmotionFromContent(selectedInsightEntry.content);
                                    const emotionColor = rawEmotion ? getEmotionColor(rawEmotion, theme) : theme.palette.text.disabled;
                                    let displayText = rawEmotion;
                                    if (rawEmotion?.toLowerCase() === 'anger' || rawEmotion?.toLowerCase() === 'angry') displayText = 'Anger';
                                    return displayText ? (
                                        <Box sx={{
                                            bgcolor: emotionColor,
                                            color: theme.palette.getContrastText(emotionColor),
                                            py: 0.5, px: 1.5, borderRadius: '8px', display: 'inline-block', mb: 2
                                        }}>
                                            <Typography variant="body1" sx={{ fontWeight: 'bold', textTransform: 'capitalize' }}>
                                                {displayText}
                                            </Typography>
                                        </Box>
                                    ) : null;
                                })()}
                                <Typography
                                    sx={{
                                        fontSize: theme.typography.pxToRem(17),
                                        lineHeight: 1.6,
                                        whiteSpace: 'pre-wrap',
                                        wordBreak: 'break-word',
                                        mb: 2,
                                        display: '-webkit-box',
                                        WebkitLineClamp: 5,
                                        WebkitBoxOrient: 'vertical',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        minHeight: '8em',
                                    }}
                                >
                                    {getMainContent(selectedInsightEntry.content)}
                                </Typography>
                                <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 'auto' }}>
                                    <Button
                                        variant="outlined"
                                        size="small"
                                        startIcon={<ArticleIcon />}
                                        onClick={() => {
                                            if (handleEntrySelect) handleEntrySelect(selectedInsightEntry);
                                            setSelectedInsightEntry(null);
                                        }}
                                    >
                                        View Entry
                                    </Button>
                                    <Button
                                        variant="outlined"
                                        size="small"
                                        startIcon={<AutoAwesomeIcon />}
                                        onClick={() => console.log("Talk to Assistant for:", selectedInsightEntry.date)}
                                    >
                                        Talk to Assistant
                                    </Button>
                                </Box>
                            </Paper>
                        ) : (
                            <Typography sx={{ textAlign: 'center', color: 'text.secondary' }}>
                                No Entry Selected
                            </Typography>
                        )}
                    </Box>
                </Paper>
            </Box>
        </>
    );
}

export default InsightsPage;
