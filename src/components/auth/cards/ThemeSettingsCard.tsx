'use client';
import React from 'react';
import { UserProfileData } from '@/types/UserProfileData';
import { useTheme } from '@/components/theme/theme-provider';
import { Moon, Sun, Laptop } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

const ThemeSettingsCard: React.FC<{ user: UserProfileData; onUpdate?: (updates: Partial<UserProfileData>) => void }> = ({ 
  user,
  onUpdate
}) => {
  const { theme, setTheme } = useTheme();

  const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
    setTheme(newTheme);
    
    // Save to user preferences if onUpdate provided
    if (onUpdate) {
      onUpdate({
        preferences: {
          ...user.preferences,
          theme: newTheme
        }
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:rotate-90 dark:scale-0" />
          <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          Display Theme
        </CardTitle>
        <CardDescription>
          Choose how Bubbas.AI appears to you
        </CardDescription>
      </CardHeader>
      <CardContent>
        <RadioGroup 
          defaultValue={theme} 
          onValueChange={(value) => handleThemeChange(value as 'light' | 'dark' | 'system')}
          className="flex flex-col space-y-1"
        >
          <div className="flex items-center space-x-2 rounded-md border p-3 hover:bg-muted">
            <RadioGroupItem value="light" id="theme-light" />
            <Label htmlFor="theme-light" className="flex flex-1 items-center gap-2 cursor-pointer">
              <Sun className="h-5 w-5 text-yellow-500" />
              Light
              <span className="ml-auto text-xs text-muted-foreground">
                {theme === 'light' && '(Current)'}
              </span>
            </Label>
          </div>
          
          <div className="flex items-center space-x-2 rounded-md border p-3 hover:bg-muted">
            <RadioGroupItem value="dark" id="theme-dark" />
            <Label htmlFor="theme-dark" className="flex flex-1 items-center gap-2 cursor-pointer">
              <Moon className="h-5 w-5 text-blue-500" />
              Dark
              <span className="ml-auto text-xs text-muted-foreground">
                {theme === 'dark' && '(Current)'}
              </span>
            </Label>
          </div>
          
          <div className="flex items-center space-x-2 rounded-md border p-3 hover:bg-muted">
            <RadioGroupItem value="system" id="theme-system" />
            <Label htmlFor="theme-system" className="flex flex-1 items-center gap-2 cursor-pointer">
              <Laptop className="h-5 w-5 text-gray-500" />
              System Default
              <span className="ml-auto text-xs text-muted-foreground">
                {theme === 'system' && '(Current)'}
              </span>
            </Label>
          </div>
        </RadioGroup>
        
        <p className="text-sm text-muted-foreground mt-4">
          The system theme will automatically switch between light and dark themes based on your device settings.
        </p>
      </CardContent>
    </Card>
  );
};

export default ThemeSettingsCard;