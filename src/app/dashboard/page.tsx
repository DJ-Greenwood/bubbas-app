'use client';

import React from 'react';
import RequireAuth from '@/components/RequiredAuth/RequiredAuth';
import UsageDashboard from '@/components/dashboard/UsageDashboard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useSubscription, SUBSCRIPTION_TIERS } from '@/utils/subscriptionService';
import { Check, ArrowRight } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import SubscriptionSelector from '@/components/auth/SubscriptionSelector';
import SubscriptionDetailsCard from '@/components/cards/SubscriptionDetailsCard';

export default function DashboardPage() {
  const { subscription, loading } = useSubscription();
  const [showUpgradeDialog, setShowUpgradeDialog] = React.useState(false);
  
  return (
    <RequireAuth>
      <div className="container mx-auto py-8 px-4">
        <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
        <p className="text-gray-600 mb-8">Manage your subscription and monitor your usage</p>
        
        <Tabs defaultValue="overview" className="space-y-8">
          <TabsList className="grid grid-cols-3 w-full max-w-md">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="usage">Usage</TabsTrigger>
            <TabsTrigger value="subscription">Subscription</TabsTrigger>
          </TabsList>
          
          {/* Overview Tab */}
          <TabsContent value="overview">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Welcome Card */}
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle>Welcome to Your Dashboard</CardTitle>
                  <CardDescription>
                    Manage your Bubbas.AI experience in one place
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p>
                    Current Plan: <span className="font-bold">{loading ? 'Loading...' : subscription.name}</span>
                  </p>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="border rounded-lg p-4">
                      <h3 className="font-medium mb-2">Today's Stats</h3>
                      <p className="text-sm text-gray-600">
                        Chats: {loading ? '...' : `${subscription.tier === 'free' ? '0/10' : subscription.tier === 'plus' ? '0/30' : '0/100'}`}
                      </p>
                      <p className="text-sm text-gray-600">
                        Tokens used: {loading ? '...' : '0'}
                      </p>
                    </div>
                    
                    <div className="border rounded-lg p-4">
                      <h3 className="font-medium mb-2">This Month</h3>
                      <p className="text-sm text-gray-600">
                        Tokens used: {loading ? '...' : '0'}
                      </p>
                      <p className="text-sm text-gray-600">
                        Limit: {loading ? '...' : `${subscription.tier === 'free' ? '10,000' : subscription.tier === 'plus' ? '50,000' : '200,000'}`}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex justify-end mt-4">
                    <Button variant="outline" size="sm" asChild>
                      <a href="/usage">
                        View Detailed Stats
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </a>
                    </Button>
                  </div>
                </CardContent>
              </Card>
              
              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button className="w-full justify-start" variant="outline" asChild>
                    <a href="/EmotionChat">
                      Start New Chat
                    </a>
                  </Button>
                  
                  <Button className="w-full justify-start" variant="outline" asChild>
                    <a href="/journal">
                      View Journal
                    </a>
                  </Button>
                  
                  <Button className="w-full justify-start" variant="outline" asChild>
                    <a href="/profile">
                      Edit Profile
                    </a>
                  </Button>
                  
                  {subscription.tier !== 'pro' && (
                    <Button className="w-full" onClick={() => setShowUpgradeDialog(true)}>
                      Upgrade Plan
                    </Button>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          {/* Usage Tab */}
          <TabsContent value="usage">
            <UsageDashboard />
          </TabsContent>
          
          {/* Subscription Tab */}
          <TabsContent value="subscription">
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <SubscriptionDetailsCard />
                
                <Card>
                  <CardHeader>
                    <CardTitle>Subscription Benefits</CardTitle>
                    <CardDescription>
                      Compare the features of each plan
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="grid grid-cols-4 gap-2 text-sm">
                        <div className="font-medium">Feature</div>
                        <div className="text-center">Free</div>
                        <div className="text-center">Plus</div>
                        <div className="text-center">Pro</div>
                      </div>
                      
                      <div className="h-px bg-gray-200"></div>
                      
                      {/* Features comparison */}
                      <div className="space-y-2">
                        <div className="grid grid-cols-4 gap-2 text-sm items-center">
                          <div>Daily Chats</div>
                          <div className="text-center">10</div>
                          <div className="text-center">30</div>
                          <div className="text-center">100</div>
                        </div>
                        
                        <div className="grid grid-cols-4 gap-2 text-sm items-center">
                          <div>Monthly Tokens</div>
                          <div className="text-center">10K</div>
                          <div className="text-center">50K</div>
                          <div className="text-center">200K</div>
                        </div>
                        
                        <div className="grid grid-cols-4 gap-2 text-sm items-center">
                          <div>Journal Entries</div>
                          <div className="text-center">50</div>
                          <div className="text-center">500</div>
                          <div className="text-center">∞</div>
                        </div>
                        
                        <div className="grid grid-cols-4 gap-2 text-sm items-center">
                          <div>Cross-Device Sync</div>
                          <div className="text-center">❌</div>
                          <div className="text-center">✅</div>
                          <div className="text-center">✅</div>
                        </div>
                        
                        <div className="grid grid-cols-4 gap-2 text-sm items-center">
                          <div>Advanced Reflections</div>
                          <div className="text-center">❌</div>
                          <div className="text-center">✅</div>
                          <div className="text-center">✅</div>
                        </div>
                        
                        <div className="grid grid-cols-4 gap-2 text-sm items-center">
                          <div>Emotional Analytics</div>
                          <div className="text-center">❌</div>
                          <div className="text-center">❌</div>
                          <div className="text-center">✅</div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              <Card>
                <CardHeader>
                  <CardTitle>Billing History</CardTitle>
                </CardHeader>
                <CardContent>
                  {subscription.tier === 'free' ? (
                    <div className="text-center py-6">
                      <p className="text-gray-500 mb-4">No billing history available on the free plan</p>
                      <Button onClick={() => setShowUpgradeDialog(true)}>
                        Upgrade to a Paid Plan
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <p className="text-gray-500">Billing history will be displayed here</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
      
      {/* Subscription upgrade dialog */}
      <Dialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
        <DialogContent className="sm:max-w-5xl">
          <DialogHeader>
            <DialogTitle>Upgrade Your Plan</DialogTitle>
          </DialogHeader>
          <SubscriptionSelector onClose={() => setShowUpgradeDialog(false)} />
        </DialogContent>
      </Dialog>
    </RequireAuth>
  );
}