import { styled, createTheme, alpha } from '@mui/material/styles';
import MuiAppBar from '@mui/material/AppBar';
import MuiDrawer from '@mui/material/Drawer';

export const drawerWidth = 240;
export const miniDrawerWidth = 65;

export const openedMixin = (theme) => ({
    width: drawerWidth,
    transition: theme.transitions.create('width', {
        easing: theme.transitions.easing.sharp,
        duration: theme.transitions.duration.enteringScreen,
    }),
    overflowX: 'hidden',
});

export const closedMixin = (theme) => ({
    transition: theme.transitions.create('width', {
        easing: theme.transitions.easing.sharp,
        duration: theme.transitions.duration.leavingScreen,
    }),
    overflowX: 'hidden',
    width: `${miniDrawerWidth}px`,
});

export const AppBar = styled(MuiAppBar, {
    shouldForwardProp: (prop) => prop !== 'isPinnedOpen',
})(({ theme, isPinnedOpen }) => ({
    zIndex: theme.zIndex.drawer + 1,
    transition: theme.transitions.create(['width', 'margin'], {
        easing: theme.transitions.easing.sharp,
        duration: theme.transitions.duration.leavingScreen,
    }),
    ...(isPinnedOpen && {
        marginLeft: drawerWidth,
        width: `calc(100% - ${drawerWidth}px)`,
        transition: theme.transitions.create(['width', 'margin'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
        }),
    }),
}));

export const Drawer = styled(MuiDrawer, { shouldForwardProp: (prop) => prop !== 'open' })(
    ({ theme, open }) => ({
        width: drawerWidth,
        flexShrink: 0,
        whiteSpace: 'nowrap',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        '& .MuiDrawer-paper': {
            boxShadow: 'none',
            display: 'flex',
            flexDirection: 'column',
        },
        ...(open && { ...openedMixin(theme), '& .MuiDrawer-paper': openedMixin(theme) }),
        ...(!open && { ...closedMixin(theme), '& .MuiDrawer-paper': closedMixin(theme) }),
    }),
);

export const baseThemeOptions = {
    typography: { fontFamily: '"Inter", Arial, sans-serif' },
    shape: { borderRadius: 12 },
    components: {
        MuiButton: { defaultProps: { disableElevation: true }, styleOverrides: { root: { textTransform: 'none', borderRadius: 20 }, contained: { borderRadius: 20 } } },
        MuiTextField: { defaultProps: { variant: 'filled' }, styleOverrides: { root: ({ theme }) => ({ '& .MuiFilledInput-underline:before, & .MuiFilledInput-underline:after, & .MuiFilledInput-underline:hover:not(.Mui-disabled):before': { borderBottom: 'none' }, '& .MuiFilledInput-root': { backgroundColor: theme.palette.action.hover, borderRadius: '4px', '&:hover, &.Mui-focused': { backgroundColor: theme.palette.action.selected } } }) } },
        MuiPaper: { defaultProps: { elevation: 0 }, styleOverrides: { root: ({ theme }) => ({ backgroundColor: theme.palette.background.paper, border: `1px solid ${theme.palette.divider}` }) } },
        MuiDrawer: { styleOverrides: { paper: ({ theme }) => ({ backgroundColor: theme.palette.background.paper, borderRight: `1px solid ${theme.palette.divider}` }) } },
        MuiAppBar: { defaultProps: { elevation: 0 }, styleOverrides: { root: ({ theme }) => ({ backgroundColor: theme.palette.background.paper, color: theme.palette.text.primary, borderBottom: `1px solid ${theme.palette.divider}` }) } },
        MuiAlert: { styleOverrides: { root: { borderRadius: '8px' }, standardSuccess: ({ theme }) => ({ color: theme.palette.primary.main, backgroundColor: alpha(theme.palette.primary.main, theme.palette.mode === 'light' ? 0.12 : 0.18), '& .MuiAlert-icon': { color: theme.palette.primary.main } }), standardError: ({ theme }) => ({ color: theme.palette.error.main, backgroundColor: alpha(theme.palette.error.main, theme.palette.mode === 'light' ? 0.12 : 0.18), '& .MuiAlert-icon': { color: theme.palette.error.main } }), standardWarning: ({ theme }) => ({ color: theme.palette.mode === 'light' ? theme.palette.warning.dark : theme.palette.warning.light, backgroundColor: alpha(theme.palette.warning.main, theme.palette.mode === 'light' ? 0.12 : 0.18), '& .MuiAlert-icon': { color: theme.palette.mode === 'light' ? theme.palette.warning.dark : theme.palette.warning.light } }), standardInfo: ({ theme }) => ({ color: theme.palette.info.main, backgroundColor: alpha(theme.palette.info.main, theme.palette.mode === 'light' ? 0.12 : 0.18), '& .MuiAlert-icon': { color: theme.palette.info.main } }) } },
        MuiSelect: { styleOverrides: { root: ({ theme }) => ({}) } }
    }
};

export const lightTheme = createTheme({ ...baseThemeOptions, palette: { mode: 'light', primary: { main: '#23325A' }, secondary: { main: '#653666' }, background: { default: '#F3EEEB', paper: '#FFFCF9' }, text: { primary: '#23325A', secondary: alpha('#23325A', 0.7) }, action: { hover: alpha('#23325A', 0.06), selected: alpha('#23325A', 0.12) }, divider: alpha('#23325A', 0.2), warning: { main: '#FFA726', light: '#FFB74D', dark: '#F57C00' }, error: { main: '#D32F2F' }, info: { main: '#0288d1' } } });

export const darkTheme = createTheme({ ...baseThemeOptions, palette: { mode: 'dark', primary: { main: '#F3EEEB' }, secondary: { main: '#DECCCA' }, background: { default: '#1A2238', paper: '#23325A' }, text: { primary: '#F3EEEB', secondary: alpha('#F3EEEB', 0.7) }, action: { hover: alpha('#F3EEEB', 0.08), selected: alpha('#F3EEEB', 0.16) }, divider: alpha('#F3EEEB', 0.12), warning: { main: '#FFB74D', light: '#FFCC80', dark: '#FFA726' }, error: { main: '#E57373' }, info: { main: '#29b6f6' } } });

const PURPLE_TEXT_COLOR = '#5A2D82';
export const girlbossTheme = createTheme({
    ...baseThemeOptions,
    palette: {
        mode: 'light',
        primary: { main: '#DAA520' },
        secondary: { main: '#FFC0CB' },
        background: { default: '#FFD1DC', paper: '#FFF0F5' },
        text: { primary: PURPLE_TEXT_COLOR, secondary: alpha(PURPLE_TEXT_COLOR, 0.75) },
        error: { main: '#B22222' },
        warning: { main: '#FF8C00' },
        info: { main: '#4682B4' },
        success: { main: '#32CD32' },
        divider: alpha(PURPLE_TEXT_COLOR, 0.3),
        action: {
            active: alpha(PURPLE_TEXT_COLOR, 0.7),
            hover: alpha(PURPLE_TEXT_COLOR, 0.08),
            selected: alpha(PURPLE_TEXT_COLOR, 0.12),
            disabled: alpha(PURPLE_TEXT_COLOR, 0.4),
            disabledBackground: alpha(PURPLE_TEXT_COLOR, 0.05),
            focus: alpha(PURPLE_TEXT_COLOR, 0.15),
        },
    },
    typography: {
        ...baseThemeOptions.typography,
        fontFamily: '"Brush Script MT", "Comic Sans MS", cursive',
        h1: {
            ...(baseThemeOptions.typography?.h1),
            fontFamily: '"Brush Script MT", "Comic Sans MS", cursive',
            color: '#DAA520',
            textShadow: '1px 1px 3px rgba(0,0,0,0.4)',
        },
        h6: {
             ...(baseThemeOptions.typography?.h6),
             color: '#4A3B00',
        }
    },
    components: {
        ...baseThemeOptions.components,
        MuiCssBaseline: {
            styleOverrides: (themeParam) => ({
                body: {
                    backgroundImage: `radial-gradient(${alpha(themeParam.palette.primary.main, 0.08)} .5px, transparent .5px), radial-gradient(${alpha(themeParam.palette.primary.main, 0.05)} .5px, ${themeParam.palette.background.default} .5px)`,
                    backgroundSize: `15px 15px, 15px 15px`,
                    backgroundPosition: `0 0, 7.5px 7.5px`,
                },
            }),
        },
        MuiButton: {
            ...baseThemeOptions.components.MuiButton,
            styleOverrides: {
                ...baseThemeOptions.components.MuiButton?.styleOverrides,
                root: ({theme, ...ownerState}) => {
                    const base = typeof baseThemeOptions.components.MuiButton?.styleOverrides?.root === 'function'
                        ? baseThemeOptions.components.MuiButton.styleOverrides.root({theme, ...ownerState})
                        : baseThemeOptions.components.MuiButton?.styleOverrides?.root;
                    return {
                        ...base,
                        fontFamily: '"Brush Script MT", "Comic Sans MS", cursive',
                        fontSize: '1.1rem',
                    };
                },
                containedPrimary: ({theme, ...ownerState}) => {
                     const base = typeof baseThemeOptions.components.MuiButton?.styleOverrides?.containedPrimary === 'function'
                        ? baseThemeOptions.components.MuiButton.styleOverrides.containedPrimary({theme, ...ownerState})
                        : baseThemeOptions.components.MuiButton?.styleOverrides?.containedPrimary;
                    return {
                        ...base,
                        color: '#4A3B00',
                        backgroundImage: 'linear-gradient(to bottom, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0.15) 50%, rgba(0,0,0,0.0) 51%, rgba(0,0,0,0.1) 100%)',
                        border: `1px solid ${alpha('#B8860B', 0.7)}`,
                        boxShadow: '0 2px 5px rgba(0,0,0,0.25)',
                        '&:hover': {
                            backgroundColor: '#C7941D',
                            boxShadow: '0 0 15px #DAA520, 0 4px 8px rgba(0,0,0,0.35)',
                        }
                    };
                },
                text: ({theme, ...ownerState}) => {
                    const base = typeof baseThemeOptions.components.MuiButton?.styleOverrides?.text === 'function'
                        ? baseThemeOptions.components.MuiButton.styleOverrides.text({theme, ...ownerState})
                        : baseThemeOptions.components.MuiButton?.styleOverrides?.text;
                    return {...base, color: PURPLE_TEXT_COLOR };
                },
                outlined: ({theme, ...ownerState}) => {
                     const base = typeof baseThemeOptions.components.MuiButton?.styleOverrides?.outlined === 'function'
                        ? baseThemeOptions.components.MuiButton.styleOverrides.outlined({theme, ...ownerState})
                        : baseThemeOptions.components.MuiButton?.styleOverrides?.outlined;
                    return {...base, color: PURPLE_TEXT_COLOR, borderColor: alpha(PURPLE_TEXT_COLOR, 0.5) };
                },
            }
        },
        MuiAppBar: {
            ...baseThemeOptions.components.MuiAppBar,
            styleOverrides: {
                ...baseThemeOptions.components.MuiAppBar?.styleOverrides,
                root: ({ theme, ...ownerState }) => {
                    const base = typeof baseThemeOptions.components.MuiAppBar?.styleOverrides?.root === 'function'
                        ? baseThemeOptions.components.MuiAppBar.styleOverrides.root({theme, ...ownerState})
                        : baseThemeOptions.components.MuiAppBar?.styleOverrides?.root;
                    return {
                        ...base,
                        backgroundColor: theme.palette.primary.main,
                        color: '#4A3B00',
                        boxShadow: `0 2px 8px ${alpha(theme.palette.common.black, 0.3)}, 0 0 12px ${alpha(theme.palette.primary.main, 0.6)} inset`,
                    };
                }
            }
        },
        MuiDrawer: {
            ...baseThemeOptions.components.MuiDrawer,
            styleOverrides: {
                ...baseThemeOptions.components.MuiDrawer?.styleOverrides,
                paper: ({ theme, ...ownerState }) => {
                    const base = typeof baseThemeOptions.components.MuiDrawer?.styleOverrides?.paper === 'function'
                        ? baseThemeOptions.components.MuiDrawer.styleOverrides.paper({theme, ...ownerState})
                        : baseThemeOptions.components.MuiDrawer?.styleOverrides?.paper;
                    return {
                        ...base,
                        backgroundColor: '#FFB6C1',
                        borderRight: `2px dashed ${theme.palette.primary.main}`
                    };
                }
            }
        },
        MuiListItemText: {
            ...baseThemeOptions.components.MuiListItemText,
            styleOverrides: {
                ...baseThemeOptions.components.MuiListItemText?.styleOverrides,
                primary: ({theme, ...ownerState}) => {
                     const base = typeof baseThemeOptions.components.MuiListItemText?.styleOverrides?.primary === 'function'
                        ? baseThemeOptions.components.MuiListItemText.styleOverrides.primary({theme, ...ownerState})
                        : baseThemeOptions.components.MuiListItemText?.styleOverrides?.primary;
                    return {...base, color: '#800080' };
                },
                secondary: ({theme, ...ownerState}) => {
                    const base = typeof baseThemeOptions.components.MuiListItemText?.styleOverrides?.secondary === 'function'
                        ? baseThemeOptions.components.MuiListItemText.styleOverrides.secondary({theme, ...ownerState})
                        : baseThemeOptions.components.MuiListItemText?.styleOverrides?.secondary;
                    return {...base, color: alpha('#800080', 0.7) };
                },
            }
        },
        MuiListItemIcon: {
            ...baseThemeOptions.components.MuiListItemIcon,
            styleOverrides: {
                ...baseThemeOptions.components.MuiListItemIcon?.styleOverrides,
                root: ({theme, ...ownerState}) => {
                    const base = typeof baseThemeOptions.components.MuiListItemIcon?.styleOverrides?.root === 'function'
                        ? baseThemeOptions.components.MuiListItemIcon.styleOverrides.root({theme, ...ownerState})
                        : baseThemeOptions.components.MuiListItemIcon?.styleOverrides?.root;
                    return {...base, color: '#800080' };
                },
            }
        },
        MuiInputLabel: {
            ...baseThemeOptions.components.MuiInputLabel,
            styleOverrides: {
                ...baseThemeOptions.components.MuiInputLabel?.styleOverrides,
                root: ({theme, ...ownerState}) => {
                    const base = typeof baseThemeOptions.components.MuiInputLabel?.styleOverrides?.root === 'function'
                        ? baseThemeOptions.components.MuiInputLabel.styleOverrides.root({theme, ...ownerState})
                        : baseThemeOptions.components.MuiInputLabel?.styleOverrides?.root;
                    return {
                        ...base,
                        color: alpha(PURPLE_TEXT_COLOR, 0.85),
                        '&.Mui-focused': {
                            color: PURPLE_TEXT_COLOR,
                            textShadow: `0 0 5px ${alpha(theme.palette.primary.main, 0.5)}`
                        }
                    };
                }
            }
        },
        MuiInputBase: {
            ...baseThemeOptions.components.MuiInputBase,
            styleOverrides: {
                ...baseThemeOptions.components.MuiInputBase?.styleOverrides,
                root: ({theme, ...ownerState}) => {
                     const base = typeof baseThemeOptions.components.MuiInputBase?.styleOverrides?.root === 'function'
                        ? baseThemeOptions.components.MuiInputBase.styleOverrides.root({theme, ...ownerState})
                        : baseThemeOptions.components.MuiInputBase?.styleOverrides?.root;
                    return {
                        ...base,
                        color: PURPLE_TEXT_COLOR,
                        backgroundColor: alpha(theme.palette.common.white, 0.15),
                        '&:hover, &.Mui-focused': {
                            backgroundColor: alpha(theme.palette.common.white, 0.2),
                        }
                    };
                },
                input: ({theme, ...ownerState}) => {
                     const base = typeof baseThemeOptions.components.MuiInputBase?.styleOverrides?.input === 'function'
                        ? baseThemeOptions.components.MuiInputBase.styleOverrides.input({theme, ...ownerState})
                        : baseThemeOptions.components.MuiInputBase?.styleOverrides?.input;
                    return {
                        ...base,
                    };
                }
            }
        },
        MuiPaper: {
            ...baseThemeOptions.components.MuiPaper,
            styleOverrides: {
                ...baseThemeOptions.components.MuiPaper?.styleOverrides,
                root: ({ theme, ...ownerState }) => {
                     const base = typeof baseThemeOptions.components.MuiPaper?.styleOverrides?.root === 'function'
                        ? baseThemeOptions.components.MuiPaper.styleOverrides.root({theme, ...ownerState})
                        : baseThemeOptions.components.MuiPaper?.styleOverrides?.root;
                    return {
                        ...base,
                        border: `1px solid ${alpha(theme.palette.primary.main, 0.3)}`,
                        boxShadow: `0 0 5px ${alpha(theme.palette.primary.main, 0.1)}`,
                    };
                },
            }
        },
        MuiCard: {
            ...baseThemeOptions.components.MuiCard,
            styleOverrides: {
                ...baseThemeOptions.components.MuiCard?.styleOverrides,
                 root: ({theme, ...ownerState}) => {
                     const base = typeof baseThemeOptions.components.MuiCard?.styleOverrides?.root === 'function'
                        ? baseThemeOptions.components.MuiCard.styleOverrides.root({theme, ...ownerState})
                        : baseThemeOptions.components.MuiCard?.styleOverrides?.root;
                    return {
                        ...base,
                        borderLeftWidth: '5px',
                        borderLeftStyle: 'solid',
                        borderLeftColor: theme.palette.primary.main,
                        boxShadow: `2px 2px 8px ${alpha(theme.palette.common.black, 0.15)}`,
                    };
                 }
            }
        },
        MuiSelect: {
            ...baseThemeOptions.components.MuiSelect,
            styleOverrides: {
                 ...baseThemeOptions.components.MuiSelect?.styleOverrides,
                 icon: ({theme, ...ownerState}) => {
                    const base = typeof baseThemeOptions.components.MuiSelect?.styleOverrides?.icon === 'function'
                        ? baseThemeOptions.components.MuiSelect.styleOverrides.icon({theme, ...ownerState})
                        : baseThemeOptions.components.MuiSelect?.styleOverrides?.icon;
                    return {...base, color: PURPLE_TEXT_COLOR };
                 },
                 root: ({theme, ...ownerState}) => {
                     const base = typeof baseThemeOptions.components.MuiSelect?.styleOverrides?.root === 'function'
                        ? baseThemeOptions.components.MuiSelect.styleOverrides.root({theme, ...ownerState})
                        : baseThemeOptions.components.MuiSelect?.styleOverrides?.root;
                    return {...base, color: PURPLE_TEXT_COLOR};
                 }
            }
        }
    }
});
