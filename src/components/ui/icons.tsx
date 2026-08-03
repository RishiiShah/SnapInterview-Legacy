import {
  ArrowLeft,
  ArrowRight,
  Bell,
  BookMarked,
  BookOpen,
  Camera,
  ChartColumn,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  Clapperboard,
  CircleCheck,
  Clock3,
  Eye,
  EyeOff,
  Flame,
  GraduationCap,
  LayoutDashboard,
  Lightbulb,
  Loader2,
  Lock,
  LogOut,
  Mail,
  Mic,
  MicOff,
  Menu,
  Pencil,
  Play,
  Plus,
  Search,
  Settings,
  Sparkles,
  Tag,
  Target,
  TrendingUp,
  Upload,
  Video,
  VideoOff,
  X,
  MessageSquare,
  Code2,
  Layout,
  Activity,
  Gem,
  UserCheck,
  User,
  Zap,
  Building2,
  Briefcase,
  Palette,
  Terminal,
  Microscope,
  Volume2,
  VolumeOff,
  Maximize2,
  Minimize2,
  HelpCircle,
  type LucideIcon,
  type LucideProps,
} from "lucide-react";

type IconProps = LucideProps & { interactive?: boolean };

const PREMIUM_STROKE_WIDTH = 2.15;

function makeIcon(Icon: LucideIcon) {
  return function PremiumIcon({ strokeWidth = PREMIUM_STROKE_WIDTH, className = "", interactive = false, ...props }: IconProps) {
    const interactiveClasses = interactive ? "transition-transform hover:scale-110 group-hover:scale-110 active:scale-95 will-change-transform" : "";
    return (
      <Icon
        absoluteStrokeWidth
        strokeWidth={strokeWidth}
        className={`icon-crisp ${interactiveClasses} ${className}`.trim()}
        {...props}
      />
    );
  };
}

export const IconCheckCircle = makeIcon(CircleCheck);
export const IconStarBurst = makeIcon(Sparkles);
export const IconClock = makeIcon(Clock3);
export const IconFlame = makeIcon(Flame);
export const IconPlus = makeIcon(Plus);
export const IconBookOpen = makeIcon(BookOpen);
export const IconArrowRight = makeIcon(ArrowRight);
export const IconArrowLeft = makeIcon(ArrowLeft);
export const IconChevronUp = makeIcon(ChevronUp);
export const IconChevronDown = makeIcon(ChevronDown);
export const IconChevronRight = makeIcon(ChevronRight);
export const IconChevronLeft = makeIcon(ChevronLeft);
export const IconSearch = makeIcon(Search);
export const IconBell = makeIcon(Bell);
export const IconSettings = makeIcon(Settings);
export const IconLogout = makeIcon(LogOut);
export const IconDashboard = makeIcon(LayoutDashboard);
export const IconMicrophone = makeIcon(Mic);
export const IconPractice = makeIcon(Target);
export const IconQuestionBank = makeIcon(BookMarked);
export const IconRecordings = makeIcon(Clapperboard);
export const IconChartBars = makeIcon(ChartColumn);
export const IconCamera = makeIcon(Camera);
export const IconXMark = makeIcon(X);
export const IconSpinner = makeIcon(Loader2);
export const IconPlay = makeIcon(Play);
export const IconUploadArrow = makeIcon(Upload);
export const IconLockClosed = makeIcon(Lock);
export const IconEnvelope = makeIcon(Mail);
export const IconEyeOpen = makeIcon(Eye);
export const IconEyeClosed = makeIcon(EyeOff);
export const IconMicrophoneSolid = makeIcon(Mic);
export const IconMicrophoneOffSolid = makeIcon(MicOff);
export const IconMenu = makeIcon(Menu);
export const IconVideoCamera = makeIcon(Video);
export const IconVideoCameraOff = makeIcon(VideoOff);
export const IconTag = makeIcon(Tag);
export const IconLightBulb = makeIcon(Lightbulb);
export const IconAcademicCap = makeIcon(GraduationCap);
export const IconPencilSquare = makeIcon(Pencil);
export const IconTrendingUp = makeIcon(TrendingUp);
export const IconMessage = makeIcon(MessageSquare);
export const IconCode = makeIcon(Code2);
export const IconLayout = makeIcon(Layout);
export const IconActivity = makeIcon(Activity);
export const IconGem = makeIcon(Gem);
export const IconUserCheck = makeIcon(UserCheck);
export const IconUser = makeIcon(User);
export const IconZap = makeIcon(Zap);
export const IconBuilding = makeIcon(Building2);
export const IconBriefcase = makeIcon(Briefcase);
export const IconPalette = makeIcon(Palette);
export const IconTerminal = makeIcon(Terminal);
export const IconMicroscope = makeIcon(Microscope);
export const IconVolume = makeIcon(Volume2);
export const IconVolumeOff = makeIcon(VolumeOff);
export const IconMaximize = makeIcon(Maximize2);
export const IconMinimize = makeIcon(Minimize2);
export const IconHelp = makeIcon(HelpCircle);
